import assert from "node:assert/strict";
import test from "node:test";

import { POST as simulatedPaymentRoute } from "@/app/api/v1/milestones/[id]/simulated-payment/route";
import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { getDashboardData } from "@/lib/repositories/dashboard";

test("an Owner can complete an idempotent simulated payment without a release or proof", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerEmail = `demo-owner-${suffix}@example.com`;
  const owner = await db.user.create({ data: { displayName: "Demo Owner", email: ownerEmail } });
  const contributorUser = await db.user.create({ data: { displayName: "Demo Contributor", email: `demo-contributor-${suffix}@example.com` } });
  const workspace = await db.workspace.create({ data: { name: "Demo payment workspace", slug: `demo-payment-${suffix}` } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "owner" } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: contributorUser.id, role: "contributor" } });
  const contributor = await db.contributor.create({ data: { workspaceId: workspace.id, createdByUserId: owner.id, linkedUserId: contributorUser.id, name: "Demo Contributor", walletAddress: null } });
  const payout = await db.payout.create({ data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: owner.id, title: "Demo payment payout", totalAmountUsdc: "4.5", status: "active" } });
  const milestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Demo milestone", description: "Payment test", amountUsdc: "4.5", sequence: 1, status: "approved" } });
  const token = await createSessionToken({ userId: owner.id, email: ownerEmail, name: owner.displayName, address: null, authType: "web2_google" });
  const params = { params: Promise.resolve({ id: milestone.id }) };
  const request = () => new Request(`https://settleflow.local/api/v1/milestones/${milestone.id}/simulated-payment?workspaceId=${workspace.id}`, { method: "POST", headers: { cookie: `sf_session=${token}` }, body: JSON.stringify({ amountUsdc: "4.5" }) });

  try {
    const first = await simulatedPaymentRoute(request(), params);
    assert.equal(first.status, 201);
    const firstBody = await first.json();
    assert.equal(firstBody.idempotent, false);
    assert.equal(firstBody.payment.method, "simulated");
    assert.equal(firstBody.payment.evidenceType, "none");
    assert.equal(firstBody.payment.status, "completed");
    assert.equal(await db.transactionProof.count({ where: { milestoneId: milestone.id } }), 0);
    assert.equal(await db.release.count({ where: { milestoneId: milestone.id } }), 0);
    assert.equal((await db.milestone.findUnique({ where: { id: milestone.id }, select: { status: true } }))?.status, "released");
    assert.equal((await db.payout.findUnique({ where: { id: payout.id }, select: { status: true } }))?.status, "completed");

    const second = await simulatedPaymentRoute(request(), params);
    assert.equal(second.status, 200);
    assert.equal((await second.json()).idempotent, true);
    assert.equal(await db.paymentAttempt.count({ where: { milestoneId: milestone.id } }), 1);
    assert.equal(await db.activityLog.count({ where: { milestoneId: milestone.id, action: "payment_simulated_completed" } }), 1);
    const dashboard = await getDashboardData({ workspaceId: workspace.id, role: "owner", userId: owner.id });
    assert.deepEqual(dashboard.paymentAttempts, [
      {
        id: firstBody.payment.id,
        payoutId: payout.id,
        milestoneId: milestone.id,
        method: "simulated",
        status: "completed",
        amount: 4.5,
        currency: "USDC",
        completedAt: dashboard.paymentAttempts[0]?.completedAt,
      },
    ]);
  } finally {
    await db.notification.deleteMany({ where: { workspaceId: workspace.id } });
    await db.activityLog.deleteMany({ where: { payoutId: payout.id } });
    await db.paymentAttempt.deleteMany({ where: { payoutId: payout.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, contributorUser.id] } } });
  }
});
