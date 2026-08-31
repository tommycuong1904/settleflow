import { Decimal } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import type { ReleaseExecutionMode } from "@/lib/arc/types";
import { recordActivity } from "@/lib/repositories/activity-log";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";
import {
  dispatchWorkspaceWebhookNotification,
  type WebhookPayload,
} from "@/lib/notifications/webhook-dispatcher";

type QueueReleasePayload = {
  payoutId: string;
  milestoneId: string;
  triggeredByUserId: string;
  amountUsdc: Decimal;
  executionMode: ReleaseExecutionMode;
  sourceWalletAddress: null;
  destinationWalletAddress: string;
  status: "queued";
};

export function deriveQueuedReleasePayload(input: {
  payoutId: string;
  milestoneId: string;
  triggeredByUserId: string;
  amountUsdc: Decimal;
  executionMode: ReleaseExecutionMode;
  destinationWalletAddress: string;
}): QueueReleasePayload {
  return {
    payoutId: input.payoutId,
    milestoneId: input.milestoneId,
    triggeredByUserId: input.triggeredByUserId,
    amountUsdc: input.amountUsdc,
    executionMode: input.executionMode,
    sourceWalletAddress: null,
    destinationWalletAddress: input.destinationWalletAddress,
    status: "queued",
  };
}

export async function queueMilestoneRelease(
  milestoneId: string,
  ownerUserId: string,
  workspaceId: string,
  amountUsdc: string,
  executionMode: ReleaseExecutionMode = "browser_wallet",
  notify: (payload: WebhookPayload) => void = (payload) => {
    void dispatchWorkspaceWebhookNotification(workspaceId, payload);
  },
) {
  let result;
  try {
    result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const milestone = await tx.milestone.findUnique({
      where: { id: milestoneId },
      select: {
        id: true,
        title: true,
        status: true,
        amountUsdc: true,
        payout: {
          select: {
            id: true,
            title: true,
            workspaceId: true,
            status: true,
            targetWalletAddress: true,
          },
        },
        releases: { select: { id: true }, take: 1 },
      },
    });
    if (!milestone) throw new Error("MILESTONE_NOT_FOUND");
    if (milestone.payout.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");
    if (milestone.status !== "approved") throw new Error("MILESTONE_NOT_APPROVED");
    if (!["active", "partially_released"].includes(milestone.payout.status)) {
      throw new Error("PAYOUT_NOT_RELEASE_READY");
    }
    if (milestone.releases.length > 0) throw new Error("RELEASE_ALREADY_EXISTS");
    if (!milestone.payout.targetWalletAddress) throw new Error("DESTINATION_WALLET_MISSING");

    const requestedAmount = new Decimal(amountUsdc);
    if (!requestedAmount.equals(milestone.amountUsdc)) throw new Error("RELEASE_AMOUNT_MISMATCH");

    const user = await tx.user.findUnique({ where: { id: ownerUserId }, select: { id: true } });
    if (!user) throw new Error("USER_NOT_FOUND");

    const hasReleaseRole = await hasWorkspaceRole(
      tx,
      milestone.payout.workspaceId,
      ownerUserId,
      ["owner", "ops"],
    );
    if (!hasReleaseRole) throw new Error("USER_NOT_ALLOWED_TO_RELEASE");

    const release = await tx.release.create({
      data: deriveQueuedReleasePayload({
        payoutId: milestone.payout.id,
        milestoneId,
        triggeredByUserId: ownerUserId,
        amountUsdc: requestedAmount,
        executionMode,
        destinationWalletAddress: milestone.payout.targetWalletAddress,
      }),
      select: {
        id: true,
        status: true,
        amountUsdc: true,
        milestoneId: true,
        payoutId: true,
        destinationWalletAddress: true,
        executionMode: true,
      },
    });
    const proof = await tx.transactionProof.create({
      data: { payoutId: milestone.payout.id, milestoneId, releaseId: release.id, status: "pending" },
      select: {
        id: true,
        releaseId: true,
        milestoneId: true,
        status: true,
        txHash: true,
        network: true,
        explorerUrl: true,
        confirmedAt: true,
        failureReason: true,
      },
    });
    await recordActivity(tx, {
      workspaceId: milestone.payout.workspaceId,
      actorUserId: ownerUserId,
      entityType: "release",
      entityId: release.id,
      payoutId: milestone.payout.id,
      milestoneId,
      releaseId: release.id,
      action: "release_queued",
      metadata: {
        proofId: proof.id,
        amountUsdc,
        executionMode,
      },
    });
    return {
      release,
      proof,
      payoutTitle: milestone.payout.title,
      milestoneTitle: milestone.title,
      amountUsdc: milestone.amountUsdc.toString(),
      recipientAddress: milestone.payout.targetWalletAddress,
    };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("RELEASE_ALREADY_EXISTS");
    }
    throw error;
  }

  // Non-blocking Webhook dispatch
  void notify({
    event: "milestone_released",
    payoutTitle: result.payoutTitle,
    milestoneTitle: result.milestoneTitle,
    amountUsdc: result.amountUsdc,
    recipientAddress: result.recipientAddress,
  });

  return { release: result.release, proof: result.proof };
}
