import { Prisma } from "@prisma/client";

export async function recalculatePayoutStatus(
  tx: Prisma.TransactionClient,
  payoutId: string,
) {
  const payout = await tx.payout.findUnique({
    where: { id: payoutId },
    select: {
      id: true,
      status: true,
      milestones: {
        select: { status: true },
      },
    },
  });

  if (!payout) {
    throw new Error("PAYOUT_NOT_FOUND");
  }

  const hasOnlyPendingMilestones = payout.milestones.every(
    (milestone) => milestone.status === "pending",
  );

  if (payout.status === "draft" && hasOnlyPendingMilestones) {
    return tx.payout.findUnique({
      where: { id: payoutId },
      select: { id: true, status: true, completedAt: true },
    });
  }

  const releasedCount = payout.milestones.filter(
    (milestone) => milestone.status === "released",
  ).length;
  const totalMilestones = payout.milestones.length;

  const nextStatus =
    totalMilestones > 0 && releasedCount === totalMilestones
      ? "completed"
      : releasedCount > 0
        ? "partially_released"
        : "active";

  return tx.payout.update({
    where: { id: payoutId },
    data: {
      status: nextStatus,
      completedAt: nextStatus === "completed" ? new Date() : null,
    },
    select: { id: true, status: true, completedAt: true },
  });
}
