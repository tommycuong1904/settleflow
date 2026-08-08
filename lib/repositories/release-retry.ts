import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";

export async function retryFailedRelease(releaseId: string, triggeredByUserId: string) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const previous = await tx.release.findUnique({
      where: { id: releaseId },
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
        proofs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true },
        },
      },
    });

    if (!previous) throw new Error("RELEASE_NOT_FOUND");
    if (previous.status !== "failed") throw new Error("RELEASE_NOT_FAILED");
    if (!previous.destinationWalletAddress) throw new Error("DESTINATION_WALLET_MISSING");

    const latestForMilestone = await tx.release.findFirst({
      where: { milestoneId: previous.milestoneId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latestForMilestone && latestForMilestone.id !== previous.id) {
      throw new Error("STALE_RELEASE_RETRY");
    }

    const latestProof = previous.proofs[0];
    if (!latestProof) throw new Error("PROOF_NOT_FOUND");
    if (latestProof.status !== "failed") throw new Error("RETRY_REQUIRES_FAILED_PROOF");

    const user = await tx.user.findUnique({
      where: { id: triggeredByUserId },
      select: { id: true },
    });
    if (!user) throw new Error("USER_NOT_FOUND");

    const canRetryRelease = await hasWorkspaceRole(
      tx,
      previous.payout.workspaceId,
      triggeredByUserId,
      ["owner", "ops"],
    );
    if (!canRetryRelease) throw new Error("FORBIDDEN_RELEASE_RETRY");

    const release = await tx.release.create({
      data: {
        payoutId: previous.payoutId,
        milestoneId: previous.milestoneId,
        triggeredByUserId,
        amountUsdc: previous.amountUsdc,
        executionMode: previous.executionMode,
        sourceWalletAddress: previous.sourceWalletAddress,
        destinationWalletAddress: previous.destinationWalletAddress,
        status: "queued",
      },
      select: { id: true, status: true, amountUsdc: true },
    });

    const proof = await tx.transactionProof.create({
      data: {
        payoutId: previous.payoutId,
        milestoneId: previous.milestoneId,
        releaseId: release.id,
        status: "pending",
      },
      select: { id: true, releaseId: true, status: true },
    });

    return { release, proof, previousReleaseId: previous.id };
  });
}
