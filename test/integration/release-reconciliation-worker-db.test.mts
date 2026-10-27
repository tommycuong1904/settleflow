import assert from "node:assert/strict";
import test from "node:test";

import { db } from "@/lib/db/client";
import { reconcilePendingBrowserReleases } from "@/lib/repositories/release-reconciliation";
import { refreshReleaseProof } from "@/lib/repositories/release-proof";

const destination = "0x1111111111111111111111111111111111111111";
const source = "0x2222222222222222222222222222222222222222";
const matchingSource = "0x3333333333333333333333333333333333333333";

test("background reconciliation preserves unknown browser payments and confirms only one exact candidate", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Reconciliation owner", email: `reconcile-worker-${suffix}@example.test` } });
  const workspace = await db.workspace.create({ data: { name: "Reconciliation worker", slug: `reconcile-worker-${suffix}` } });
  const contributor = await db.contributor.create({ data: { workspaceId: workspace.id, createdByUserId: owner.id, name: "Recipient", walletAddress: destination } });
  const payout = await db.payout.create({ data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: owner.id, title: "Reconciliation payout", totalAmountUsdc: "2", status: "active", targetWalletAddress: destination } });
  const pendingMilestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Unknown", description: "Keep pending", amountUsdc: "1", sequence: 1, status: "approved" } });
  const matchingMilestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Matching", description: "Confirm", amountUsdc: "1", sequence: 2, status: "approved" } });
  const oldRequest = new Date(Date.now() - 61_000);
  const pendingRelease = await db.release.create({ data: { payoutId: payout.id, milestoneId: pendingMilestone.id, triggeredByUserId: owner.id, amountUsdc: "1", status: "pending", executionMode: "browser_wallet", sourceWalletAddress: source, destinationWalletAddress: destination, requestedAt: oldRequest } });
  const matchingRelease = await db.release.create({ data: { payoutId: payout.id, milestoneId: matchingMilestone.id, triggeredByUserId: owner.id, amountUsdc: "1", status: "queued", executionMode: "browser_wallet", sourceWalletAddress: matchingSource, destinationWalletAddress: destination, requestedAt: oldRequest } });
  await db.transactionProof.createMany({ data: [
    { payoutId: payout.id, milestoneId: pendingMilestone.id, releaseId: pendingRelease.id, status: "pending" },
    { payoutId: payout.id, milestoneId: matchingMilestone.id, releaseId: matchingRelease.id, status: "pending" },
  ] });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "owner" } });
  const refreshCalls: string[] = [];

  try {
    const summary = await reconcilePendingBrowserReleases({
      findCandidates: async (release) => release.sourceWalletAddress === matchingSource
        ? [{ txHash: `0x${"ab".repeat(32)}`, blockNumber: "123", confirmedAt: new Date().toISOString(), explorerUrl: "https://explorer.example.test/tx" }]
        : [],
      refresh: (async (releaseId: string) => {
        refreshCalls.push(releaseId);
        return {};
      }) as unknown as typeof refreshReleaseProof,
    });

    assert.deepEqual(summary, { scanned: 2, matched: 1, pending: 1, ambiguous: 0, errors: 0 });
    assert.deepEqual(refreshCalls, [matchingRelease.id]);
    assert.equal((await db.release.findUniqueOrThrow({ where: { id: pendingRelease.id } })).status, "pending");
    assert.equal((await db.release.findUniqueOrThrow({ where: { id: matchingRelease.id } })).status, "pending");
  } finally {
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
