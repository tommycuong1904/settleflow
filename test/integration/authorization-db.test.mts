import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { GET as getPayouts } from "@/app/api/payouts/route";
import { GET as getPayoutDetail, PATCH as updatePayout } from "@/app/api/v1/payouts/[id]/route";
import { POST as createPayout } from "@/app/api/v1/payouts/route";
import { POST as createContributor } from "@/app/api/contributors/route";
import { PATCH as updateContributor } from "@/app/api/v1/contributors/[id]/route";
import { POST as approveMilestone } from "@/app/api/v1/milestones/[id]/approve/route";

const walletA = "0x1111111111111111111111111111111111111111";
const walletB = "0x2222222222222222222222222222222222222222";

function sessionCookie(token: string): string {
  return `sf_session=${token}`;
}

async function tokenFor(email: string, userId: string): Promise<string> {
  return createSessionToken({ userId, email, name: email, address: null, authType: "web2_google" });
}

test("validation routes keep machine codes and return actionable form guidance", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Validation Owner", email: `validation-${suffix}@example.com` } });
  const workspace = await db.workspace.create({ data: { name: "Validation Workspace", slug: `validation-${suffix}` } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "owner" } });
  const token = await tokenFor(owner.email!, owner.id);
  const headers = { cookie: sessionCookie(token), "content-type": "application/json" };

  try {
    const invalidPayout = await createPayout(new Request(`https://settleflow.local/api/v1/payouts?workspaceId=${workspace.id}`, {
      method: "POST", headers, body: JSON.stringify({ title: "", contributorId: "", totalAmountUsdc: "0", milestones: [] }),
    }));
    assert.equal(invalidPayout.status, 400);
    assert.deepEqual(await invalidPayout.json(), {
      error: "Add a title, choose a contributor, enter a total amount, and include at least one milestone.",
      code: "INVALID_PAYOUT_PAYLOAD",
    });

    const invalidContributor = await createContributor(new Request(`https://settleflow.local/api/contributors?workspaceId=${workspace.id}`, {
      method: "POST", headers, body: JSON.stringify({ name: "Taylor", walletAddress: "not-a-wallet" }),
    }));
    assert.equal(invalidContributor.status, 400);
    assert.deepEqual(await invalidContributor.json(), {
      error: "For Wallet payment, enter a valid wallet address that starts with 0x.",
      code: "INVALID_WALLET_ADDRESS",
    });
  } finally {
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: owner.id } });
  }
});

test("cross-workspace create and approve mutations are rejected without side effects", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerEmail = `mutation-owner-${suffix}@example.com`;
  const reviewerEmail = `mutation-reviewer-${suffix}@example.com`;
  const owner = await db.user.create({ data: { displayName: "Mutation Owner", email: ownerEmail } });
  const reviewer = await db.user.create({ data: { displayName: "Mutation Reviewer", email: reviewerEmail } });
  const workspaceA = await db.workspace.create({ data: { name: "Mutation Workspace A", slug: `mutation-a-${suffix}` } });
  const workspaceB = await db.workspace.create({ data: { name: "Mutation Workspace B", slug: `mutation-b-${suffix}` } });
  await db.workspaceMember.createMany({ data: [
    { workspaceId: workspaceA.id, userId: owner.id, role: "owner" },
    { workspaceId: workspaceA.id, userId: reviewer.id, role: "reviewer" },
  ] });
  const contributor = await db.contributor.create({ data: { workspaceId: workspaceB.id, createdByUserId: owner.id, name: "Target Contributor", walletAddress: walletB } });
  const payout = await db.payout.create({ data: { workspaceId: workspaceB.id, contributorId: contributor.id, createdByUserId: owner.id, title: "Target Payout", totalAmountUsdc: "5", status: "active", targetWalletAddress: walletB } });
  const milestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Target Milestone", description: "Mutation boundary", amountUsdc: "5", sequence: 1, status: "submitted" } });

  try {
    const ownerToken = await tokenFor(ownerEmail, owner.id);
    const createResponse = await createPayout(new Request(`https://settleflow.local/api/v1/payouts?workspaceId=${workspaceB.id}`, {
      method: "POST",
      headers: { cookie: sessionCookie(ownerToken), "content-type": "application/json" },
      body: JSON.stringify({ title: "Cross Workspace", contributorId: contributor.id, targetWalletAddress: walletB, totalAmountUsdc: "1", workspaceId: workspaceB.id, milestones: [{ title: "M", description: "M", amountUsdc: "1", sequence: 1 }] }),
    }));
    assert.equal(createResponse.status, 403);
    assert.equal((await createResponse.json()).code, "AUTH_CONTEXT_REQUIRED");
    assert.equal(await db.payout.count({ where: { workspaceId: workspaceB.id } }), 1);

    const reviewerToken = await tokenFor(reviewerEmail, reviewer.id);
    const approveResponse = await approveMilestone(new Request(`https://settleflow.local/api/v1/milestones/${milestone.id}/approve?workspaceId=${workspaceB.id}`, {
      method: "POST", headers: { cookie: sessionCookie(reviewerToken) },
    }), { params: Promise.resolve({ id: milestone.id }) });
    assert.equal(approveResponse.status, 403);
    assert.equal((await approveResponse.json()).code, "AUTH_CONTEXT_REQUIRED");
    assert.equal((await db.milestone.findUnique({ where: { id: milestone.id }, select: { status: true } }))?.status, "submitted");
    assert.equal(await db.release.count({ where: { milestoneId: milestone.id } }), 0);
    assert.equal(await db.transactionProof.count({ where: { milestoneId: milestone.id } }), 0);
  } finally {
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } });
    await db.workspace.deleteMany({ where: { id: { in: [workspaceA.id, workspaceB.id] } } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, reviewer.id] } } });
  }
});

test("an owner cannot update a draft payout or contributor outside the selected workspace", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Scoped Mutation Owner", email: `scoped-mutation-${suffix}@example.com` } });
  const workspaceA = await db.workspace.create({ data: { name: "Scoped Mutation A", slug: `scoped-mutation-a-${suffix}` } });
  const workspaceB = await db.workspace.create({ data: { name: "Scoped Mutation B", slug: `scoped-mutation-b-${suffix}` } });
  const contributor = await db.contributor.create({ data: { workspaceId: workspaceB.id, createdByUserId: owner.id, name: "Workspace B Contributor", walletAddress: walletB } });
  const payout = await db.payout.create({ data: { workspaceId: workspaceB.id, contributorId: contributor.id, createdByUserId: owner.id, title: "Workspace B Draft", totalAmountUsdc: "5" } });

  try {
    await db.workspaceMember.createMany({ data: [
      { workspaceId: workspaceA.id, userId: owner.id, role: "owner" },
      { workspaceId: workspaceB.id, userId: owner.id, role: "owner" },
    ] });
    const token = await tokenFor(owner.email!, owner.id);
    const headers = { cookie: sessionCookie(token), "content-type": "application/json" };

    const payoutResponse = await updatePayout(new Request(`https://settleflow.local/api/v1/payouts/${payout.id}?workspaceId=${workspaceA.id}`, {
      method: "PATCH", headers, body: JSON.stringify({ title: "Cross workspace edit" }),
    }), { params: Promise.resolve({ id: payout.id }) });
    assert.equal(payoutResponse.status, 404);
    assert.equal((await db.payout.findUnique({ where: { id: payout.id } }))?.title, "Workspace B Draft");

    const contributorResponse = await updateContributor(new Request(`https://settleflow.local/api/v1/contributors/${contributor.id}?workspaceId=${workspaceA.id}`, {
      method: "PATCH", headers, body: JSON.stringify({ name: "Cross workspace contributor edit" }),
    }), { params: Promise.resolve({ id: contributor.id }) });
    assert.equal(contributorResponse.status, 404);
    assert.equal((await db.contributor.findUnique({ where: { id: contributor.id } }))?.name, "Workspace B Contributor");
  } finally {
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } });
    await db.workspace.deleteMany({ where: { id: { in: [workspaceA.id, workspaceB.id] } } });
    await db.user.delete({ where: { id: owner.id } });
  }
});

test("real DB authorization enforces user, membership, workspace, role, and object boundaries", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const emailA = `db-auth-a-${suffix}@example.com`;
  const emailReviewer = `db-auth-reviewer-${suffix}@example.com`;
  const emailContributor = `db-auth-contributor-${suffix}@example.com`;
  const emailNoMembership = `db-auth-none-${suffix}@example.com`;

  const userA = await db.user.create({ data: { displayName: "DB User A", email: emailA } });
  const reviewer = await db.user.create({ data: { displayName: "DB Reviewer", email: emailReviewer } });
  const contributorUser = await db.user.create({ data: { displayName: "DB Contributor", email: emailContributor } });
  const noMembershipUser = await db.user.create({ data: { displayName: "No Membership", email: emailNoMembership } });
  const workspaceA = await db.workspace.create({ data: { name: "DB Workspace A", slug: `db-a-${suffix}` } });
  const workspaceB = await db.workspace.create({ data: { name: "DB Workspace B", slug: `db-b-${suffix}` } });
  const contributorA = await db.contributor.create({
    data: { workspaceId: workspaceA.id, linkedUserId: contributorUser.id, createdByUserId: userA.id, name: "Contributor A", walletAddress: walletA },
  });
  const contributorB = await db.contributor.create({
    data: { workspaceId: workspaceB.id, createdByUserId: userA.id, name: "Contributor B", walletAddress: walletB },
  });
  const payoutA = await db.payout.create({
    data: { workspaceId: workspaceA.id, contributorId: contributorA.id, createdByUserId: userA.id, title: "Payout A", totalAmountUsdc: "10" },
  });
  const payoutB = await db.payout.create({
    data: { workspaceId: workspaceB.id, contributorId: contributorB.id, createdByUserId: userA.id, title: "Payout B", totalAmountUsdc: "20" },
  });
  await db.workspaceMember.createMany({ data: [
    { workspaceId: workspaceA.id, userId: userA.id, role: "owner" },
    { workspaceId: workspaceA.id, userId: reviewer.id, role: "reviewer" },
    { workspaceId: workspaceA.id, userId: contributorUser.id, role: "contributor" },
  ] });

  const request = (path: string, token: string) => new Request(`https://settleflow.local${path}`, { headers: { cookie: sessionCookie(token) } });
  try {
    const ownerToken = await tokenFor(emailA, userA.id);
    const ownerList = await getPayouts(request(`/api/v1/payouts?workspaceId=${workspaceA.id}&actor=contributor`, ownerToken));
    assert.equal(ownerList.status, 200);
    assert.deepEqual((await ownerList.json()).data.map((item: { id: string }) => item.id), [payoutA.id]);

    const unauthorizedSelector = await getPayouts(request(`/api/v1/payouts?workspaceId=${workspaceB.id}`, ownerToken));
    assert.equal(unauthorizedSelector.status, 403);
    assert.equal((await unauthorizedSelector.json()).code, "AUTH_CONTEXT_REQUIRED");

    const crossWorkspaceDetail = await getPayoutDetail(request(`/api/v1/payouts/${payoutB.id}?workspaceId=${workspaceA.id}`, ownerToken), { params: Promise.resolve({ id: payoutB.id }) });
    assert.equal(crossWorkspaceDetail.status, 404);

    const reviewerList = await getPayouts(request(`/api/v1/payouts?workspaceId=${workspaceA.id}`, await tokenFor(emailReviewer, reviewer.id)));
    assert.equal(reviewerList.status, 200);
    assert.equal((await reviewerList.json()).data.length, 1);

    const contributorList = await getPayouts(request(`/api/v1/payouts?workspaceId=${workspaceA.id}&actor=owner`, await tokenFor(emailContributor, contributorUser.id)));
    assert.equal(contributorList.status, 200);
    assert.deepEqual((await contributorList.json()).data.map((item: { id: string }) => item.id), [payoutA.id]);

    const forgedOwnerCreate = await createPayout(new Request(`https://settleflow.local/api/v1/payouts?workspaceId=${workspaceA.id}`, {
      method: "POST",
      headers: {
        cookie: sessionCookie(await tokenFor(emailContributor, contributorUser.id)),
        "content-type": "application/json",
        "x-settleflow-actor": "owner",
        "x-settleflow-owner-user-id": userA.id,
        "x-settleflow-contributor-user-id": userA.id,
      },
      body: JSON.stringify({
        title: "Forged owner payout",
        contributorId: contributorA.id,
        targetWalletAddress: walletA,
        totalAmountUsdc: "1",
        ownerUserId: userA.id,
        createdByUserId: userA.id,
        actor: "owner",
        milestones: [{ title: "Forged milestone", description: "Must not create", amountUsdc: "1", sequence: 1 }],
      }),
    }));
    assert.equal(forgedOwnerCreate.status, 403);
    assert.equal((await forgedOwnerCreate.json()).code, "FORBIDDEN_PAYOUT_CREATE_ACTOR");
    assert.equal(await db.payout.count({ where: { workspaceId: workspaceA.id } }), 1);

    const missingMembership = await getPayouts(request("/api/v1/payouts", await tokenFor(emailNoMembership, noMembershipUser.id)));
    assert.equal(missingMembership.status, 403);
    assert.equal((await missingMembership.json()).code, "AUTH_CONTEXT_REQUIRED");

    const missingUser = await getPayouts(request("/api/v1/payouts", await tokenFor(`missing-${suffix}@example.com`, "missing-user-id")));
    assert.equal(missingUser.status, 403);
    assert.equal((await missingUser.json()).code, "AUTH_CONTEXT_REQUIRED");
  } finally {
    await db.payout.deleteMany({ where: { id: { in: [payoutA.id, payoutB.id] } } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } });
    await db.contributor.deleteMany({ where: { id: { in: [contributorA.id, contributorB.id] } } });
    await db.workspace.deleteMany({ where: { id: { in: [workspaceA.id, workspaceB.id] } } });
    await db.user.deleteMany({ where: { id: { in: [userA.id, reviewer.id, contributorUser.id, noMembershipUser.id] } } });
  }
});
