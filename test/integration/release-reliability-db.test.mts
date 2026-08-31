import assert from "node:assert/strict";
import test from "node:test";

import { db } from "@/lib/db/client";
import { queueMilestoneRelease } from "@/lib/repositories/milestone-release";
import { refreshReleaseProof } from "@/lib/repositories/release-proof";
import { retryFailedRelease } from "@/lib/repositories/release-retry";

const destination = "0x3333333333333333333333333333333333333333";

test("release failure, retry, proof refresh, idempotency, and workspace scope use real DB state", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({ data: { displayName: "Release Owner", email: `release-owner-${suffix}@example.com` } });
  const otherUser = await db.user.create({ data: { displayName: "Other Owner", email: `release-other-${suffix}@example.com` } });
  const workspace = await db.workspace.create({ data: { name: "Release Workspace", slug: `release-${suffix}` } });
  const otherWorkspace = await db.workspace.create({ data: { name: "Other Workspace", slug: `other-${suffix}` } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "owner" } });
  await db.workspaceMember.create({ data: { workspaceId: otherWorkspace.id, userId: otherUser.id, role: "owner" } });
  const contributor = await db.contributor.create({ data: { workspaceId: workspace.id, createdByUserId: user.id, name: "Release Contributor", walletAddress: destination } });
  const payout = await db.payout.create({
    data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: user.id, title: "Release Payout", totalAmountUsdc: "10", status: "active", targetWalletAddress: destination },
  });
  const milestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Approved milestone", description: "Release test", amountUsdc: "10", sequence: 1, status: "approved" } });

  try {
    const queued = await queueMilestoneRelease(milestone.id, user.id, workspace.id, "10", "browser_wallet", () => undefined);
    assert.equal(queued.release.status, "queued");
    assert.equal(queued.proof.status, "pending");

    await assert.rejects(
      queueMilestoneRelease(milestone.id, user.id, workspace.id, "10", "browser_wallet", () => undefined),
      /RELEASE_ALREADY_EXISTS/,
    );

    const failed = await refreshReleaseProof(queued.release.id, user.id, workspace.id, { status: "failed", failureReason: "deterministic test failure" });
    assert.equal(failed.release.status, "failed");
    assert.equal(failed.proof.status, "failed");

    const retried = await retryFailedRelease(queued.release.id, user.id, workspace.id);
    assert.equal(retried.release.status, "queued");
    assert.notEqual(retried.release.id, queued.release.id);

    await assert.rejects(
      retryFailedRelease(queued.release.id, otherUser.id, otherWorkspace.id),
      /WORKSPACE_SCOPE_MISMATCH/,
    );

    const confirmed = await refreshReleaseProof(retried.release.id, user.id, workspace.id, {
      status: "confirmed",
      txHash: `0x${"ab".repeat(32)}`,
      network: "arc-testnet",
      explorerUrl: "https://example.invalid/tx/test",
    });
    assert.equal(confirmed.release.status, "confirmed");
    assert.equal(confirmed.proof.status, "confirmed");

    const [releaseCount, proofCount, persistedMilestone] = await Promise.all([
      db.release.count({ where: { payoutId: payout.id } }),
      db.transactionProof.count({ where: { payoutId: payout.id } }),
      db.milestone.findUnique({ where: { id: milestone.id }, select: { status: true } }),
    ]);
    assert.equal(releaseCount, 2);
    assert.equal(proofCount, 2);
    assert.equal(persistedMilestone?.status, "released");
  } finally {
    await db.transactionProof.deleteMany({ where: { payoutId: payout.id } });
    await db.release.deleteMany({ where: { payoutId: payout.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: { in: [workspace.id, otherWorkspace.id] } } });
    await db.workspace.deleteMany({ where: { id: { in: [workspace.id, otherWorkspace.id] } } });
    await db.user.deleteMany({ where: { id: { in: [user.id, otherUser.id] } } });
  }
});
