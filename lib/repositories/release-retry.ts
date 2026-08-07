import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";

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
      },
    });

    if (!previous) throw new Error("RELEASE_NOT_FOUND");
    if (previous.status !== "failed") throw new Error("RELEASE_NOT_FAILED");
    if (!previous.destinationWalletAddress) throw new Error("DESTINATION_WALLET_MISSING");

    const user = await tx.user.findUnique({
      where: { id: triggeredByUserId },
      select: { id: true },
    });
    if (!user) throw new Error("USER_NOT_FOUND");

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
      select: { id: true, status: true },
    });

    return { release, proof, previousReleaseId: previous.id };
  });
}
