import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

const env = process.env as Record<string, string | undefined>;
const previousMode = env.NEXT_PUBLIC_ARC_EXECUTION_MODE;
const previousGate = env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION;
env.NEXT_PUBLIC_ARC_EXECUTION_MODE = "real";
delete env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION;

const moduleUrl = new URL(
  "../../app/api/v1/milestones/[id]/release/route.ts",
  import.meta.url,
).href + `?readiness=${Date.now()}`;
const { GET: releaseReadiness } = (await import(moduleUrl)) as {
  GET: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
};

const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });

test("release readiness rejects an unauthenticated request", async () => {
  const response = await releaseReadiness(
    new Request("https://settleflow.local/api/v1/milestones/missing/release"),
    routeParams("missing"),
  );

  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "AUTH_REQUIRED");
});

test("unauthorized real readiness is read-only and creates no release records", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `readiness-owner-${suffix}@example.com`;
  const recipient = "0x7777777777777777777777777777777777777777";
  const owner = await db.user.create({ data: { displayName: "Readiness Owner", email } });
  const workspace = await db.workspace.create({ data: { name: "Readiness Workspace", slug: `readiness-${suffix}` } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "owner" } });
  const contributor = await db.contributor.create({
    data: { workspaceId: workspace.id, createdByUserId: owner.id, name: "Readiness Contributor", walletAddress: recipient },
  });
  const payout = await db.payout.create({
    data: {
      workspaceId: workspace.id,
      contributorId: contributor.id,
      createdByUserId: owner.id,
      title: "Readiness Payout",
      totalAmountUsdc: "1",
      status: "active",
      targetWalletAddress: recipient,
    },
  });
  const milestone = await db.milestone.create({
    data: { payoutId: payout.id, title: "Readiness Milestone", description: "", amountUsdc: "1", sequence: 1, status: "approved" },
  });
  const token = await createSessionToken({
    userId: owner.id,
    email,
    name: owner.displayName,
    address: null,
    authType: "web2_google",
  });

  try {
    const response = await releaseReadiness(new Request(
      `https://settleflow.local/api/v1/milestones/${milestone.id}/release?workspaceId=${workspace.id}`,
      { headers: { cookie: `sf_session=${token}` } },
    ), routeParams(milestone.id));

    assert.equal(response.status, 403);
    const body = await response.json() as { code?: string; error?: string };
    assert.equal(body.code, "REAL_EXECUTION_NOT_AUTHORIZED");
    assert.match(body.error ?? "", /not authorized/i);
    assert.equal(await db.release.count({ where: { milestoneId: milestone.id } }), 0);
    assert.equal(await db.transactionProof.count({ where: { milestoneId: milestone.id } }), 0);
  } finally {
    await db.transactionProof.deleteMany({ where: { payoutId: payout.id } });
    await db.release.deleteMany({ where: { payoutId: payout.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: owner.id } });
    if (previousMode === undefined) delete env.NEXT_PUBLIC_ARC_EXECUTION_MODE;
    else env.NEXT_PUBLIC_ARC_EXECUTION_MODE = previousMode;
    if (previousGate === undefined) delete env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION;
    else env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION = previousGate;
  }
});

test("authorized real readiness is still read-only", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `ready-owner-${suffix}@example.com`;
  const recipient = "0x8888888888888888888888888888888888888888";
  env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION = "enabled";
  const owner = await db.user.create({ data: { displayName: "Ready Owner", email } });
  const workspace = await db.workspace.create({ data: { name: "Ready Workspace", slug: `ready-${suffix}` } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "owner" } });
  const contributor = await db.contributor.create({
    data: { workspaceId: workspace.id, createdByUserId: owner.id, name: "Ready Contributor", walletAddress: recipient },
  });
  const payout = await db.payout.create({
    data: {
      workspaceId: workspace.id,
      contributorId: contributor.id,
      createdByUserId: owner.id,
      title: "Ready Payout",
      totalAmountUsdc: "1",
      status: "active",
      targetWalletAddress: recipient,
    },
  });
  const milestone = await db.milestone.create({
    data: { payoutId: payout.id, title: "Ready Milestone", description: "", amountUsdc: "1", sequence: 1, status: "approved" },
  });
  const token = await createSessionToken({
    userId: owner.id,
    email,
    name: owner.displayName,
    address: null,
    authType: "web2_google",
  });

  try {
    const response = await releaseReadiness(new Request(
      `https://settleflow.local/api/v1/milestones/${milestone.id}/release?workspaceId=${workspace.id}`,
      { headers: { cookie: `sf_session=${token}` } },
    ), routeParams(milestone.id));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ready: true });
    assert.equal(await db.release.count({ where: { milestoneId: milestone.id } }), 0);
    assert.equal(await db.transactionProof.count({ where: { milestoneId: milestone.id } }), 0);
  } finally {
    await db.transactionProof.deleteMany({ where: { payoutId: payout.id } });
    await db.release.deleteMany({ where: { payoutId: payout.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: owner.id } });
    if (previousMode === undefined) delete env.NEXT_PUBLIC_ARC_EXECUTION_MODE;
    else env.NEXT_PUBLIC_ARC_EXECUTION_MODE = previousMode;
    if (previousGate === undefined) delete env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION;
    else env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION = previousGate;
  }
});

test("a contributor cannot inspect payment readiness", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerEmail = `readiness-owner-authz-${suffix}@example.com`;
  const contributorEmail = `readiness-contributor-${suffix}@example.com`;
  const recipient = "0x9999999999999999999999999999999999999999";
  const owner = await db.user.create({ data: { displayName: "Readiness Authz Owner", email: ownerEmail } });
  const member = await db.user.create({ data: { displayName: "Readiness Contributor", email: contributorEmail } });
  const workspace = await db.workspace.create({ data: { name: "Readiness Authz Workspace", slug: `readiness-authz-${suffix}` } });
  await db.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: owner.id, role: "owner" },
      { workspaceId: workspace.id, userId: member.id, role: "contributor" },
    ],
  });
  const contributor = await db.contributor.create({
    data: { workspaceId: workspace.id, createdByUserId: owner.id, name: "Readiness Authz Contributor", email: contributorEmail, walletAddress: recipient },
  });
  const payout = await db.payout.create({
    data: {
      workspaceId: workspace.id,
      contributorId: contributor.id,
      createdByUserId: owner.id,
      title: "Readiness Authz Payout",
      totalAmountUsdc: "1",
      status: "active",
      targetWalletAddress: recipient,
    },
  });
  const milestone = await db.milestone.create({
    data: { payoutId: payout.id, title: "Readiness Authz Milestone", description: "", amountUsdc: "1", sequence: 1, status: "approved" },
  });
  const token = await createSessionToken({
    userId: member.id,
    email: contributorEmail,
    name: member.displayName,
    address: null,
    authType: "web2_google",
  });

  try {
    const response = await releaseReadiness(new Request(
      `https://settleflow.local/api/v1/milestones/${milestone.id}/release?workspaceId=${workspace.id}`,
      { headers: { cookie: `sf_session=${token}` } },
    ), routeParams(milestone.id));

    assert.equal(response.status, 403);
    const body = await response.json() as { code?: string };
    assert.equal(body.code, "FORBIDDEN_MILESTONE_RELEASE_ACTOR");
    assert.equal(await db.release.count({ where: { milestoneId: milestone.id } }), 0);
    assert.equal(await db.transactionProof.count({ where: { milestoneId: milestone.id } }), 0);
  } finally {
    await db.transactionProof.deleteMany({ where: { payoutId: payout.id } });
    await db.release.deleteMany({ where: { payoutId: payout.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, member.id] } } });
  }
});
