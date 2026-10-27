import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { ARC_CONFIG } from "@/lib/arc/config";
import { isValidUsdcAmount } from "@/lib/api/payout-payload";
import { db } from "@/lib/db/client";
import { createInAppNotifications } from "@/lib/repositories/notifications";
import { recordActivity } from "@/lib/repositories/activity-log";
import { recalculatePayoutStatus } from "@/lib/repositories/payout-status";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";

export function isSimulatedPaymentEnabled() {
  return ARC_CONFIG.executionMode === "demo" || ARC_CONFIG.executionMode === "mock";
}

export async function completeSimulatedPayment(
  milestoneId: string,
  ownerUserId: string,
  workspaceId: string,
  amountUsdc: string,
) {
  if (!isSimulatedPaymentEnabled()) throw new Error("SIMULATED_PAYMENT_DISABLED");
  if (!isValidUsdcAmount(amountUsdc)) throw new Error("INVALID_PAYMENT_AMOUNT");

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT id FROM "Milestone" WHERE id = ${milestoneId} FOR UPDATE`;
    const milestone = await tx.milestone.findFirst({
      where: { id: milestoneId, payout: { workspaceId } },
      select: {
        id: true,
        title: true,
        status: true,
        sequence: true,
        amountUsdc: true,
        payoutId: true,
        payout: { select: { id: true, workspaceId: true, status: true, currency: true, contributor: { select: { name: true, linkedUserId: true } } } },
        releases: { select: { id: true }, take: 1 },
        paymentAttempts: { select: { id: true, status: true, method: true, evidenceType: true, amountUsdc: true, completedAt: true }, take: 1 },
      },
    });
    if (!milestone) throw new Error("MILESTONE_NOT_FOUND");
    if (milestone.payout.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");

    const existing = milestone.paymentAttempts[0];
    if (existing?.method === "simulated" && existing.status === "completed" && existing.evidenceType === "none") {
      return { payment: { ...existing, amountUsdc: existing.amountUsdc.toString() }, idempotent: true };
    }
    if (existing || milestone.releases.length > 0) throw new Error("PAYMENT_ATTEMPT_EXISTS");
    if (milestone.status !== "approved") throw new Error("MILESTONE_NOT_APPROVED");
    if (!['active', 'partially_released'].includes(milestone.payout.status)) throw new Error("PAYOUT_NOT_RELEASE_READY");
    await tx.$queryRaw`SELECT id FROM "Payout" WHERE id = ${milestone.payoutId} FOR UPDATE`;
    const earlierUnpaidMilestone = await tx.milestone.findFirst({
      where: {
        payoutId: milestone.payoutId,
        sequence: { lt: milestone.sequence },
        status: { not: "released" },
      },
      select: { id: true },
      orderBy: { sequence: "asc" },
    });
    if (earlierUnpaidMilestone) throw new Error("PREVIOUS_MILESTONE_NOT_RELEASED");
    if (!(await hasWorkspaceRole(tx, workspaceId, ownerUserId, ["owner"]))) throw new Error("USER_NOT_ALLOWED_TO_RELEASE");
    if (!(await tx.user.findUnique({ where: { id: ownerUserId }, select: { id: true } }))) throw new Error("USER_NOT_FOUND");

    const requestedAmount = new Decimal(amountUsdc);
    if (!requestedAmount.equals(milestone.amountUsdc)) throw new Error("PAYMENT_AMOUNT_MISMATCH");
    const now = new Date();
    const payment = await tx.paymentAttempt.create({
      data: {
        payoutId: milestone.payoutId,
        milestoneId,
        markedByUserId: ownerUserId,
        method: "simulated",
        status: "completed",
        evidenceType: "none",
        amountUsdc: requestedAmount,
        currency: milestone.payout.currency,
        recipientLabel: milestone.payout.contributor.name,
        completedAt: now,
      },
      select: { id: true, method: true, status: true, evidenceType: true, amountUsdc: true, currency: true, recipientLabel: true, completedAt: true },
    });
    const released = await tx.milestone.updateMany({ where: { id: milestoneId, status: "approved" }, data: { status: "released", releasedAt: now } });
    if (released.count !== 1) throw new Error("MILESTONE_NOT_APPROVED");
    await recordActivity(tx, { workspaceId, actorUserId: ownerUserId, entityType: "payment", entityId: payment.id, payoutId: milestone.payoutId, milestoneId, action: "payment_simulated_completed", metadata: { amountUsdc, currency: milestone.payout.currency, evidenceType: "none", fundsMoved: false } });
    await createInAppNotifications(tx, { workspaceId, userIds: [ownerUserId, milestone.payout.contributor.linkedUserId ?? ""], type: "payment_completed", title: "Payment recorded for testing", body: `${amountUsdc} ${milestone.payout.currency} was marked paid for testing. No funds moved. View payment summary.`, href: `/payouts/${milestone.payoutId}?receipt=payment` });
    const payout = await recalculatePayoutStatus(tx, milestone.payoutId, workspaceId, true);
    return { payment: { ...payment, amountUsdc: payment.amountUsdc.toString(), completedAt: payment.completedAt?.toISOString() ?? null }, payout, idempotent: false };
  });
}
