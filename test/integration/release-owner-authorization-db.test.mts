import assert from "node:assert/strict";
import test from "node:test";

import { POST as release } from "@/app/api/v1/milestones/[id]/release/route";
import { GET as getRelease } from "@/app/api/v1/releases/[id]/route";
import { POST as refreshProof } from "@/app/api/v1/releases/[id]/proof/refresh/route";
import { POST as retry } from "@/app/api/v1/releases/[id]/retry/route";
import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

test("a contributor cannot queue, refresh, or retry a workspace release", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Release Owner", email: `release-owner-${suffix}@example.test` } });
  const reviewerUser = await db.user.create({ data: { displayName: "Release Reviewer", email: `release-reviewer-${suffix}@example.test` } });
  const contributorUser = await db.user.create({ data: { displayName: "Release Contributor", email: `release-contributor-${suffix}@example.test` } });
  const otherContributorUser = await db.user.create({ data: { displayName: "Other Release Contributor", email: `other-release-contributor-${suffix}@example.test` } });
  const workspace = await db.workspace.create({ data: { name: "Release Authorization", slug: `release-auth-${suffix}` } });
  const contributor = await db.contributor.create({ data: { workspaceId: workspace.id, createdByUserId: owner.id, linkedUserId: contributorUser.id, name: "Release contributor", walletAddress: "0x1111111111111111111111111111111111111111" } });
  const payout = await db.payout.create({ data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: owner.id, title: "Release payout", totalAmountUsdc: "5", status: "active", targetWalletAddress: contributor.walletAddress } });
  const milestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Approved milestone", description: "Financial authorization", amountUsdc: "5", sequence: 1, status: "approved" } });
  const failedRelease = await db.release.create({ data: { payoutId: payout.id, milestoneId: milestone.id, triggeredByUserId: owner.id, amountUsdc: "5", status: "failed", executionMode: "browser_wallet", destinationWalletAddress: contributor.walletAddress!, failedAt: new Date() } });
  const proof = await db.transactionProof.create({ data: { payoutId: payout.id, milestoneId: milestone.id, releaseId: failedRelease.id, status: "failed", failureReason: "Original failure", failedAt: new Date() } });
  await db.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: owner.id, role: "owner" },
    { workspaceId: workspace.id, userId: reviewerUser.id, role: "reviewer" },
    { workspaceId: workspace.id, userId: contributorUser.id, role: "contributor" },
    { workspaceId: workspace.id, userId: otherContributorUser.id, role: "contributor" },
  ] });
  const token = await createSessionToken({ userId: contributorUser.id, email: contributorUser.email!, name: contributorUser.displayName, address: null, authType: "web2_google" });
  const reviewerToken = await createSessionToken({ userId: reviewerUser.id, email: reviewerUser.email!, name: reviewerUser.displayName, address: null, authType: "web2_google" });
  const otherToken = await createSessionToken({ userId: otherContributorUser.id, email: otherContributorUser.email!, name: otherContributorUser.displayName, address: null, authType: "web2_google" });
  const headers = { cookie: `sf_session=${token}`, "content-type": "application/json" };
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  try {
    const assignedRelease = await getRelease(new Request(`https://settleflow.local/api/v1/releases/${failedRelease.id}?workspaceId=${workspace.id}`, {
      headers: { cookie: `sf_session=${token}` },
    }), params(failedRelease.id));
    assert.equal(assignedRelease.status, 200);

    const foreignRelease = await getRelease(new Request(`https://settleflow.local/api/v1/releases/${failedRelease.id}?workspaceId=${workspace.id}`, {
      headers: { cookie: `sf_session=${otherToken}` },
    }), params(failedRelease.id));
    assert.equal(foreignRelease.status, 404);

    const queueAttempt = await release(new Request(`https://settleflow.local/api/v1/milestones/${milestone.id}/release?workspaceId=${workspace.id}`, {
      method: "POST", headers, body: JSON.stringify({ amountUsdc: "5", executionMode: "browser_wallet" }),
    }), params(milestone.id));
    assert.equal(queueAttempt.status, 403);
    assert.equal(await db.release.count({ where: { milestoneId: milestone.id } }), 1);

    const reviewerQueueAttempt = await release(new Request(`https://settleflow.local/api/v1/milestones/${milestone.id}/release?workspaceId=${workspace.id}`, {
      method: "POST", headers: { cookie: `sf_session=${reviewerToken}`, "content-type": "application/json" }, body: JSON.stringify({ amountUsdc: "5", executionMode: "browser_wallet" }),
    }), params(milestone.id));
    assert.equal(reviewerQueueAttempt.status, 403);
    assert.equal(await db.release.count({ where: { milestoneId: milestone.id } }), 1);

    const refreshAttempt = await refreshProof(new Request(`https://settleflow.local/api/v1/releases/${failedRelease.id}/proof/refresh?workspaceId=${workspace.id}`, {
      method: "POST", headers, body: JSON.stringify({ status: "failed", failureReason: "Contributor rewrite attempt" }),
    }), params(failedRelease.id));
    assert.equal(refreshAttempt.status, 403);
    assert.equal((await db.transactionProof.findUnique({ where: { id: proof.id } }))?.failureReason, "Original failure");

    const retryAttempt = await retry(new Request(`https://settleflow.local/api/v1/releases/${failedRelease.id}/retry?workspaceId=${workspace.id}`, { method: "POST", headers }), params(failedRelease.id));
    assert.equal(retryAttempt.status, 403);
    assert.equal(await db.release.count({ where: { milestoneId: milestone.id } }), 1);
  } finally {
    await db.transactionProof.deleteMany({ where: { payoutId: payout.id } });
    await db.release.deleteMany({ where: { payoutId: payout.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, reviewerUser.id, contributorUser.id, otherContributorUser.id] } } });
  }
});
