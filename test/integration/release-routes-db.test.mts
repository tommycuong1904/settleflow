import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { POST as releaseRoute } from "@/app/api/v1/milestones/[id]/release/route";
import { POST as retryRoute } from "@/app/api/v1/releases/[id]/retry/route";
import { POST as proofRefreshRoute } from "@/app/api/v1/releases/[id]/proof/refresh/route";

const wallet = "0x4444444444444444444444444444444444444444";

test("release, retry, proof refresh, tampering, and workspace boundaries hold through real routes", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `route-owner-${suffix}@example.com`;
  const user = await db.user.create({ data: { displayName: "Route Owner", email } });
  const workspace = await db.workspace.create({ data: { name: "Route Workspace", slug: `route-${suffix}` } });
  const otherWorkspace = await db.workspace.create({ data: { name: "Route Other", slug: `route-other-${suffix}` } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "owner" } });
  const contributor = await db.contributor.create({ data: { workspaceId: workspace.id, createdByUserId: user.id, name: "Route Contributor", walletAddress: wallet } });
  const payout = await db.payout.create({ data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: user.id, title: "Route Payout", totalAmountUsdc: "5", status: "active", targetWalletAddress: wallet } });
  const milestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Route Milestone", description: "Route test", amountUsdc: "5", sequence: 1, status: "approved" } });
  const token = await createSessionToken({ userId: "forged-id", email, name: "Route Owner", address: null, authType: "web2_google" });
  const headers = { cookie: `sf_session=${token}` };
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  try {
    const queued = await releaseRoute(new Request(`https://settleflow.local/api/v1/milestones/${milestone.id}/release?workspaceId=${workspace.id}&actor=contributor`, {
      method: "POST", headers, body: JSON.stringify({ amountUsdc: "5", executionMode: "browser_wallet", ownerUserId: "other-user", workspaceId: otherWorkspace.id }),
    }), params(milestone.id));
    assert.equal(queued.status, 201);
    const queuedBody = await queued.json();
    assert.equal(queuedBody.release.status, "queued");

    await assert.rejects(
      proofRefreshRoute(new Request(`https://settleflow.local/api/v1/releases/${queuedBody.release.id}/proof/refresh?workspaceId=${otherWorkspace.id}`, {
        method: "POST", headers, body: JSON.stringify({ status: "failed", failureReason: "route failure" }),
      }), params(queuedBody.release.id)),
      /AUTH_CONTEXT_REQUIRED/,
    );

    const failed = await proofRefreshRoute(new Request(`https://settleflow.local/api/v1/releases/${queuedBody.release.id}/proof/refresh`, {
      method: "POST", headers, body: JSON.stringify({ status: "failed", failureReason: "route failure" }),
    }), params(queuedBody.release.id));
    assert.equal(failed.status, 200);
    assert.equal((await failed.json()).release.status, "failed");

    await assert.rejects(
      retryRoute(new Request(`https://settleflow.local/api/v1/releases/${queuedBody.release.id}/retry?actor=contributor&workspaceId=${otherWorkspace.id}`, { method: "POST", headers }), params(queuedBody.release.id)),
      /AUTH_CONTEXT_REQUIRED/,
    );
    const retried = await retryRoute(new Request(`https://settleflow.local/api/v1/releases/${queuedBody.release.id}/retry`, { method: "POST", headers }), params(queuedBody.release.id));
    assert.equal(retried.status, 201);
    const retryBody = await retried.json();
    assert.notEqual(retryBody.release.id, queuedBody.release.id);

    const duplicateRetry = await retryRoute(new Request(`https://settleflow.local/api/v1/releases/${queuedBody.release.id}/retry`, { method: "POST", headers }), params(queuedBody.release.id));
    assert.equal(duplicateRetry.status, 409);

    const confirmed = await proofRefreshRoute(new Request(`https://settleflow.local/api/v1/releases/${retryBody.release.id}/proof/refresh`, {
      method: "POST", headers, body: JSON.stringify({ status: "confirmed", txHash: `0x${"cd".repeat(32)}`, network: "arc-testnet", explorerUrl: "https://example.invalid/tx/route" }),
    }), params(retryBody.release.id));
    assert.equal(confirmed.status, 200);
    assert.equal((await confirmed.json()).release.status, "confirmed");

    assert.equal(await db.release.count({ where: { payoutId: payout.id } }), 2);
    assert.equal(await db.milestone.findUnique({ where: { id: milestone.id }, select: { status: true } }).then((row) => row?.status), "released");
  } finally {
    await db.transactionProof.deleteMany({ where: { payoutId: payout.id } });
    await db.release.deleteMany({ where: { payoutId: payout.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.deleteMany({ where: { id: { in: [workspace.id, otherWorkspace.id] } } });
    await db.user.delete({ where: { id: user.id } });
  }
});
