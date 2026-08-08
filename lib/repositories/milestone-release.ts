import { Decimal } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import type { ReleaseExecutionMode } from "@/lib/arc/types";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";

export async function queueMilestoneRelease(
  milestoneId: string,
  triggeredByUserId: string,
  amountUsdc: string,
  executionMode: ReleaseExecutionMode = "browser_wallet",
) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const milestone = await tx.milestone.findUnique({
      where: { id: milestoneId },
      select: {
        id: true,
        status: true,
        amountUsdc: true,
        payout: { select: { id: true, workspaceId: true, targetWalletAddress: true } },
        releases: { select: { id: true }, take: 1 },
      },
    });
    if (!milestone) throw new Error("MILESTONE_NOT_FOUND");
    if (milestone.status !== "approved") throw new Error("MILESTONE_NOT_APPROVED");
    if (milestone.releases.length > 0) throw new Error("RELEASE_ALREADY_EXISTS");
    if (!milestone.payout.targetWalletAddress) throw new Error("DESTINATION_WALLET_MISSING");

    const requestedAmount = new Decimal(amountUsdc);
    if (!requestedAmount.equals(milestone.amountUsdc)) throw new Error("RELEASE_AMOUNT_MISMATCH");

    const user = await tx.user.findUnique({ where: { id: triggeredByUserId }, select: { id: true } });
    if (!user) throw new Error("USER_NOT_FOUND");

    const hasReleaseRole = await hasWorkspaceRole(
      tx,
      milestone.payout.workspaceId,
      triggeredByUserId,
      ["owner", "ops"],
    );
    if (!hasReleaseRole) throw new Error("USER_NOT_ALLOWED_TO_RELEASE");

    const release = await tx.release.create({
      data: {
        payoutId: milestone.payout.id,
        milestoneId,
        triggeredByUserId,
        amountUsdc: requestedAmount,
        executionMode,
        sourceWalletAddress: null,
        destinationWalletAddress: milestone.payout.targetWalletAddress,
        status: "queued",
      },
      select: { id: true, status: true, amountUsdc: true },
    });
    const proof = await tx.transactionProof.create({
      data: { payoutId: milestone.payout.id, milestoneId, releaseId: release.id, status: "pending" },
      select: { id: true, status: true },
    });
    return { release, proof };
  });
}
