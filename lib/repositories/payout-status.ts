import { Prisma } from "@prisma/client";

type PayoutStatusValue = "draft" | "active" | "partially_released" | "completed";
type MilestoneStatusValue = "pending" | "submitted" | "approved" | "released" | "rejected";

type PayoutStatusSnapshot = {
  status: PayoutStatusValue;
  completedAt: Date | null;
  milestones: Array<{ status: MilestoneStatusValue }>;
};

type PayoutStatusDecision = {
  status: PayoutStatusValue;
  completedAt: Date | null;
  shouldPersist: boolean;
};

export function derivePayoutStatusDecision(
  payout: PayoutStatusSnapshot,
  now = new Date(),
): PayoutStatusDecision {
  const totalMilestones = payout.milestones.length;
  const hasOnlyPendingMilestones = payout.milestones.every(
    (milestone) => milestone.status === "pending",
  );

  if (totalMilestones === 0) {
    return { status: "draft", completedAt: null, shouldPersist: true };
  }

  if (payout.status === "draft" && hasOnlyPendingMilestones) {
    return {
      status: payout.status,
      completedAt: payout.completedAt,
      shouldPersist: false,
    };
  }

  const someMilestonesReleased = payout.milestones.some(
    (milestone) => milestone.status === "released",
  );
  const allMilestonesReleased = payout.milestones.every(
    (milestone) => milestone.status === "released",
  );

  const nextStatus = allMilestonesReleased
    ? "completed"
    : someMilestonesReleased
      ? "partially_released"
      : "active";

  return {
    status: nextStatus,
    completedAt:
      nextStatus === "completed"
        ? (payout.status === "completed" ? payout.completedAt ?? now : now)
        : null,
    shouldPersist: true,
  };
}

export async function recalculatePayoutStatus(
  tx: Prisma.TransactionClient,
  payoutId: string,
  workspaceId: string,
  alreadyLocked = false,
) {
  if (!alreadyLocked) {
    await tx.$queryRaw`SELECT id FROM "Payout" WHERE id = ${payoutId} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
  }
  const payout = await tx.payout.findFirst({
    where: { id: payoutId, workspaceId },
    select: {
      id: true,
      status: true,
      completedAt: true,
      milestones: {
        select: { status: true },
      },
    },
  });

  if (!payout) {
    throw new Error("PAYOUT_NOT_FOUND");
  }

  const decision = derivePayoutStatusDecision(payout);

  if (!decision.shouldPersist) {
    return tx.payout.findFirst({
      where: { id: payoutId, workspaceId },
      select: { id: true, status: true, completedAt: true },
    });
  }

  return tx.payout.update({
    where: { id: payoutId },
    data: {
      status: decision.status,
      completedAt: decision.completedAt,
    },
    select: { id: true, status: true, completedAt: true },
  });
}
