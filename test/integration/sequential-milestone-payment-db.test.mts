import assert from "node:assert/strict";
import test from "node:test";

import { queueMilestoneRelease } from "@/lib/repositories/milestone-release";
import { completeSimulatedPayment } from "@/lib/repositories/simulated-payment";
import { db } from "@/lib/db/client";

test("later milestones cannot be queued or marked paid until earlier milestones are released", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Sequential Owner", email: `sequential-owner-${suffix}@example.test` } });
  const workspace = await db.workspace.create({ data: { name: "Sequential Payments", slug: `sequential-${suffix}` } });
  const contributor = await db.contributor.create({ data: { workspaceId: workspace.id, createdByUserId: owner.id, name: "Sequential contributor", walletAddress: "0x1111111111111111111111111111111111111111" } });
  const payout = await db.payout.create({ data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: owner.id, title: "Sequential payout", totalAmountUsdc: "10", status: "active", targetWalletAddress: contributor.walletAddress } });
  const first = await db.milestone.create({ data: { payoutId: payout.id, title: "First", description: "First payment", amountUsdc: "5", sequence: 1, status: "approved" } });
  const second = await db.milestone.create({ data: { payoutId: payout.id, title: "Second", description: "Second payment", amountUsdc: "5", sequence: 2, status: "approved" } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "owner" } });

  try {
    await assert.rejects(
      queueMilestoneRelease(second.id, owner.id, workspace.id, "5"),
      /PREVIOUS_MILESTONE_NOT_RELEASED/,
    );
    await assert.rejects(
      completeSimulatedPayment(second.id, owner.id, workspace.id, "5"),
      /PREVIOUS_MILESTONE_NOT_RELEASED/,
    );
    assert.equal(await db.release.count({ where: { payoutId: payout.id } }), 0);
    assert.equal(await db.paymentAttempt.count({ where: { payoutId: payout.id } }), 0);

    await db.milestone.update({ where: { id: first.id }, data: { status: "released", releasedAt: new Date() } });
    const queued = await queueMilestoneRelease(second.id, owner.id, workspace.id, "5");
    assert.equal(queued.release.milestoneId, second.id);
    await db.transactionProof.deleteMany({ where: { releaseId: queued.release.id } });
    await db.release.delete({ where: { id: queued.release.id } });

    const simulated = await completeSimulatedPayment(second.id, owner.id, workspace.id, "5");
    assert.equal(simulated.idempotent, false);
    assert.equal((await db.milestone.findUnique({ where: { id: second.id } }))?.status, "released");
  } finally {
    await db.paymentAttempt.deleteMany({ where: { payoutId: payout.id } });
    await db.transactionProof.deleteMany({ where: { payoutId: payout.id } });
    await db.release.deleteMany({ where: { payoutId: payout.id } });
    await db.milestone.deleteMany({ where: { payoutId: payout.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: owner.id } });
  }
});
