import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { db } from "@/lib/db/client";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";

export async function activatePayout(id: string, workspaceId: string, activatedByUserId: string) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const payout = await tx.payout.findFirst({
      where: { id, workspaceId },
      select: { id: true, status: true, totalAmountUsdc: true, targetWalletAddress: true,
        milestones: { select: { amountUsdc: true, title: true, description: true } } },
    });
    if (!payout) throw new Error("PAYOUT_NOT_FOUND");

    const user = await tx.user.findUnique({
      where: { id: activatedByUserId },
      select: { id: true },
    });
    if (!user) throw new Error("USER_NOT_FOUND");

    const canActivate = await hasWorkspaceRole(tx, workspaceId, activatedByUserId, ["owner", "ops"]);
    if (!canActivate) throw new Error("USER_NOT_ALLOWED_TO_ACTIVATE_PAYOUT");

    if (payout.status !== "draft") throw new Error("PAYOUT_NOT_DRAFT");
    if (!payout.targetWalletAddress || payout.milestones.length === 0) throw new Error("PAYOUT_INCOMPLETE");

    const total = payout.milestones.reduce(
      (sum: Decimal, milestone: { amountUsdc: Decimal }) => sum.plus(milestone.amountUsdc),
      new Decimal(0),
    );
    if (!total.equals(payout.totalAmountUsdc)) throw new Error("MILESTONE_TOTAL_MISMATCH");

    return tx.payout.update({ where: { id }, data: { status: "active" }, select: { id: true, status: true } });
  });
}
