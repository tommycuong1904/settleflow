import { db } from "@/lib/db/client";

export async function getReleaseById(id: string) {
  const release = await db.release.findUnique({
    where: { id },
    select: {
      id: true,
      payoutId: true,
      milestoneId: true,
      triggeredByUserId: true,
      amountUsdc: true,
      status: true,
      arcRequestId: true,
      destinationWalletAddress: true,
      failureReason: true,
      requestedAt: true,
      executedAt: true,
      failedAt: true,
      createdAt: true,
      updatedAt: true,
      proofs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          txHash: true,
          network: true,
          explorerUrl: true,
          blockNumber: true,
          failureReason: true,
          confirmedAt: true,
          failedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!release) return null;
  return {
    ...release,
    amountUsdc: release.amountUsdc.toString(),
    proofs: release.proofs.map((proof: (typeof release.proofs)[number]) => ({
      ...proof,
      blockNumber: proof.blockNumber?.toString() ?? null,
    })),
  };
}
