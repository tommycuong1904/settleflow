import { db } from "@/lib/db/client";

export async function getDashboardSummary(workspaceId?: string) {
  const payoutWhere = { workspaceId };
  const [activePayouts, pendingReviewMilestones, confirmedSettlements, outstanding] =
    await Promise.all([
      db.payout.count({ where: { ...payoutWhere, status: "active" } }),
      db.milestone.count({ where: { payout: payoutWhere, status: "submitted" } }),
      db.transactionProof.count({ where: { payout: payoutWhere, status: "confirmed" } }),
      db.payout.aggregate({
        where: { ...payoutWhere, status: { in: ["active", "partially_released"] } },
        _sum: { totalAmountUsdc: true },
      }),
    ]);

  return {
    stats: {
      activePayouts,
      pendingReviewMilestones,
      confirmedSettlements,
      totalOutstandingUsdc: outstanding._sum.totalAmountUsdc?.toString() ?? "0",
    },
  };
}
