import assert from "node:assert/strict";
import test from "node:test";
import { db } from "@/lib/db/client";
import { queueMilestoneRelease } from "@/lib/repositories/milestone-release";
import { claimReleaseExecution, refreshReleaseProof } from "@/lib/repositories/release-proof";

test("two complete confirmations serialize and cannot regress completed payout", { skip: "Confirmation requires independently verified Arc transactions; this test must not submit real transactions." }, async () => {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({ data: { displayName: "P2J payout", email: `p2j-payout-${s}@test.invalid` } });
  const ws = await db.workspace.create({ data: { name: "P2J payout", slug: `p2j-payout-${s}` } });
  await db.workspaceMember.create({ data: { workspaceId: ws.id, userId: user.id, role: "owner" } });
  const c = await db.contributor.create({ data: { workspaceId: ws.id, createdByUserId: user.id, name: "C", walletAddress: "0x7777777777777777777777777777777777777777" } });
  const payout = await db.payout.create({ data: { workspaceId: ws.id, contributorId: c.id, createdByUserId: user.id, title: "P", totalAmountUsdc: "10", status: "active", targetWalletAddress: c.walletAddress } });
  const milestones = await Promise.all([1, 2].map(sequence => db.milestone.create({ data: { payoutId: payout.id, title: `M${sequence}`, description: "x", amountUsdc: "5", sequence, status: "approved" } })));
  try {
    const releases = await Promise.all(milestones.map(m => queueMilestoneRelease(m.id, user.id, ws.id, "5", "circle_wallet", () => undefined)));
    await Promise.all(releases.map(r => claimReleaseExecution(r.release.id, ws.id)));
    const flows = releases.map((r, i) => refreshReleaseProof(r.release.id, user.id, ws.id, { status: "confirmed", txHash: `0x${String(i + 1).padStart(64, "0")}`, network: "arc-testnet" }));
    const results = await Promise.allSettled(flows);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 2);
    const final = await db.payout.findUnique({ where: { id: payout.id }, select: { status: true, completedAt: true } });
    assert.equal(final?.status, "completed");
    assert.ok(final?.completedAt instanceof Date);
    assert.equal((await db.milestone.count({ where: { payoutId: payout.id, status: "released" } })), 2);
  } finally {
    await db.transactionProof.deleteMany({ where: { payoutId: payout.id } }); await db.release.deleteMany({ where: { payoutId: payout.id } }); await db.milestone.deleteMany({ where: { payoutId: payout.id } }); await db.payout.delete({ where: { id: payout.id } }); await db.contributor.delete({ where: { id: c.id } }); await db.workspaceMember.deleteMany({ where: { workspaceId: ws.id } }); await db.workspace.delete({ where: { id: ws.id } }); await db.user.delete({ where: { id: user.id } });
  }
});
