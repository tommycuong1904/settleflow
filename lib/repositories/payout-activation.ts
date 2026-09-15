import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { db } from "@/lib/db/client";
import { recordActivity } from "@/lib/repositories/activity-log";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";

type ActivationSnapshot = {
  targetWalletAddress: string | null;
  milestones: Array<{ amountUsdc: Decimal }>;
  totalAmountUsdc: Decimal;
};

export function derivePayoutActivationInvariantError(
  payout: ActivationSnapshot,
): "PAYOUT_INCOMPLETE" | "MILESTONE_TOTAL_MISMATCH" | null {
  if (!payout.targetWalletAddress || payout.milestones.length === 0 ||
      !payout.totalAmountUsdc.isFinite() || !payout.totalAmountUsdc.gt(0) ||
      payout.milestones.some((milestone) => !milestone.amountUsdc.isFinite() || !milestone.amountUsdc.gt(0) || milestone.amountUsdc.decimalPlaces() > 6)) {
    return "PAYOUT_INCOMPLETE";
  }

  const total = payout.milestones.reduce(
    (sum: Decimal, milestone: { amountUsdc: Decimal }) => sum.plus(milestone.amountUsdc),
    new Decimal(0),
  );

  if (!total.equals(payout.totalAmountUsdc)) {
    return "MILESTONE_TOTAL_MISMATCH";
  }

  return null;
}

export async function activatePayout(id: string, workspaceId: string, ownerUserId: string) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT id FROM "Payout" WHERE id = ${id} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
    const payout = await tx.payout.findFirst({
      where: { id, workspaceId },
      select: { id: true, status: true, totalAmountUsdc: true, targetWalletAddress: true,
        workspaceId: true,
        milestones: { select: { amountUsdc: true, title: true, description: true } } },
    });
    if (!payout) throw new Error("PAYOUT_NOT_FOUND");
    if (payout.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");

    const user = await tx.user.findUnique({
      where: { id: ownerUserId },
      select: { id: true },
    });
    if (!user) throw new Error("USER_NOT_FOUND");

    const canActivate = await hasWorkspaceRole(tx, workspaceId, ownerUserId, ["owner"]);
    if (!canActivate) throw new Error("USER_NOT_ALLOWED_TO_ACTIVATE_PAYOUT");

    if (payout.status !== "draft") throw new Error("PAYOUT_NOT_DRAFT");

    if (payout.targetWalletAddress && !/^0x[a-fA-F0-9]{40}$/.test(payout.targetWalletAddress.trim())) throw new Error("PAYOUT_INCOMPLETE");

    const invariantError = derivePayoutActivationInvariantError({
      targetWalletAddress: payout.targetWalletAddress,
      milestones: payout.milestones,
      totalAmountUsdc: payout.totalAmountUsdc,
    });
    if (invariantError) throw new Error(invariantError);

    const updated = await tx.payout.update({ where: { id }, data: { status: "active" }, select: { id: true, status: true } });
    await recordActivity(tx, {
      workspaceId,
      actorUserId: ownerUserId,
      entityType: "payout",
      entityId: id,
      payoutId: id,
      action: "payout_activated",
    });
    return updated;
  });
}
