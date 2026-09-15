import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import type { ReleaseExecutionMode } from "@/lib/arc/types";
import { recordActivity } from "@/lib/repositories/activity-log";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";

type RetryReleasePayload = {
  payoutId: string;
  milestoneId: string | null;
  triggeredByUserId: string;
  amountUsdc: Prisma.Decimal;
  executionMode: ReleaseExecutionMode;
  sourceWalletAddress: string | null;
  destinationWalletAddress: string;
  status: "queued";
};

export function deriveRetryReleasePayload(input: {
  payoutId: string;
  milestoneId: string | null;
  triggeredByUserId: string;
  amountUsdc: Prisma.Decimal;
  executionMode: ReleaseExecutionMode;
  sourceWalletAddress: string | null;
  destinationWalletAddress: string;
}): RetryReleasePayload {
  return {
    payoutId: input.payoutId,
    milestoneId: input.milestoneId,
    triggeredByUserId: input.triggeredByUserId,
    amountUsdc: input.amountUsdc,
    executionMode: input.executionMode,
    sourceWalletAddress: input.sourceWalletAddress,
    destinationWalletAddress: input.destinationWalletAddress,
    status: "queued",
  };
}

export async function retryFailedRelease(releaseId: string, ownerUserId: string, workspaceId: string) {
  try {
    return await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const previousBeforeLock = await tx.release.findFirst({
        where: { id: releaseId, payout: { workspaceId } },
        select: { milestoneId: true },
      });
      if (!previousBeforeLock) throw new Error("RELEASE_NOT_FOUND");
      if (previousBeforeLock.milestoneId) {
        await tx.$queryRaw`SELECT id FROM "Milestone" WHERE id = ${previousBeforeLock.milestoneId} FOR UPDATE`;
      }
      const previous = await tx.release.findFirst({
        where: { id: releaseId, payout: { workspaceId } },
        select: {
          id: true,
          payoutId: true,
          milestoneId: true,
          amountUsdc: true,
          executionMode: true,
          sourceWalletAddress: true,
          status: true,
          destinationWalletAddress: true,
          payout: {
            select: { workspaceId: true },
          },
          milestone: {
            select: { status: true },
          },
          proofs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, status: true, failureReason: true },
          },
        },
      });

      if (!previous) throw new Error("RELEASE_NOT_FOUND");
      if (previous.payout.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");
      if (previous.status !== "failed") throw new Error("RELEASE_NOT_FAILED");
      if (previous.milestone?.status !== "approved") throw new Error("MILESTONE_NOT_APPROVED_FOR_RETRY");
      if (!previous.destinationWalletAddress) throw new Error("DESTINATION_WALLET_MISSING");

      // The retry invariant is scoped to the same payout and milestone. In
      // particular, milestoneId=null must not collide with unrelated
      // payout-level releases in the workspace.
      const latestForMilestone = await tx.release.findFirst({
        where: {
          payoutId: previous.payoutId,
          milestoneId: previous.milestoneId,
          payout: { workspaceId },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (latestForMilestone && latestForMilestone.id !== previous.id) {
        throw new Error("STALE_RELEASE_RETRY");
      }

      const latestProof = previous.proofs[0];
      if (!latestProof) throw new Error("PROOF_NOT_FOUND");
      if (latestProof.status !== "failed") throw new Error("RETRY_REQUIRES_FAILED_PROOF");
      if (previous.executionMode === "circle_wallet" && !latestProof.failureReason?.startsWith("CIRCLE_WALLET_TRUSTED_FAILURE:")) {
        throw new Error("CIRCLE_WALLET_RETRY_REQUIRES_TRUSTED_FAILURE");
      }

      // Role authorization below validates the authenticated principal's
      // membership; no caller-controlled User lookup is used as identity.
      const canRetryRelease = await hasWorkspaceRole(
        tx,
        previous.payout.workspaceId,
        ownerUserId,
        ["owner", "ops"],
      );
      if (!canRetryRelease) throw new Error("FORBIDDEN_RELEASE_RETRY");

      const release = await tx.release.create({
        data: deriveRetryReleasePayload({
          payoutId: previous.payoutId,
          milestoneId: previous.milestoneId,
          triggeredByUserId: ownerUserId,
          amountUsdc: previous.amountUsdc,
          executionMode: previous.executionMode,
          sourceWalletAddress: previous.executionMode === "circle_wallet" ? null : previous.sourceWalletAddress,
          destinationWalletAddress: previous.destinationWalletAddress,
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
        data: {
          payoutId: previous.payoutId,
          milestoneId: previous.milestoneId,
          releaseId: release.id,
          status: "pending",
        },
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
        workspaceId: previous.payout.workspaceId,
        actorUserId: ownerUserId,
        entityType: "release",
        entityId: release.id,
        payoutId: previous.payoutId,
        milestoneId: previous.milestoneId ?? undefined,
        releaseId: release.id,
        action: "release_retried",
        metadata: {
          previousReleaseId: previous.id,
          proofId: proof.id,
          amountUsdc: previous.amountUsdc.toString(),
          executionMode: previous.executionMode,
        },
      });

      return { release, proof, previousReleaseId: previous.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("RELEASE_ALREADY_EXISTS");
    }
    throw error;
  }
}
