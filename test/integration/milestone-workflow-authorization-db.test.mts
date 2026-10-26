import assert from "node:assert/strict";
import test from "node:test";

import { POST as approve } from "@/app/api/v1/milestones/[id]/approve/route";
import { POST as reject } from "@/app/api/v1/milestones/[id]/reject/route";
import { POST as submit } from "@/app/api/v1/milestones/[id]/submit/route";
import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

async function requestFor(user: { id: string; email: string | null }, path: string, body?: unknown) {
  const email = user.email ?? "";
  const token = await createSessionToken({ userId: user.id, email, name: email, address: null, authType: "web2_google" });
  return new Request(`https://settleflow.local${path}`, {
    method: "POST",
    headers: { cookie: `sf_session=${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("milestone workflow permits only the assigned contributor and workspace owner at each transition", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Workflow Owner", email: `workflow-owner-${suffix}@example.test` } });
  const reviewer = await db.user.create({ data: { displayName: "Workflow Reviewer", email: `workflow-reviewer-${suffix}@example.test` } });
  const assignee = await db.user.create({ data: { displayName: "Workflow Assignee", email: `workflow-assignee-${suffix}@example.test` } });
  const otherContributor = await db.user.create({ data: { displayName: "Workflow Other", email: `workflow-other-${suffix}@example.test` } });
  const workspace = await db.workspace.create({ data: { name: "Workflow Authorization", slug: `workflow-auth-${suffix}` } });
  const contributor = await db.contributor.create({ data: { workspaceId: workspace.id, createdByUserId: owner.id, linkedUserId: assignee.id, name: "Assigned contributor" } });
  const payout = await db.payout.create({ data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: owner.id, title: "Workflow payout", totalAmountUsdc: "5", status: "active" } });
  const milestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Workflow milestone", description: "Authorization boundary", amountUsdc: "5", sequence: 1 } });
  await db.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: owner.id, role: "owner" },
    { workspaceId: workspace.id, userId: reviewer.id, role: "reviewer" },
    { workspaceId: workspace.id, userId: assignee.id, role: "contributor" },
    { workspaceId: workspace.id, userId: otherContributor.id, role: "contributor" },
  ] });
  const path = `/api/v1/milestones/${milestone.id}`;

  try {
    assert.equal((await submit(await requestFor(owner, `${path}/submit?workspaceId=${workspace.id}`, { summary: "Owner cannot submit." }), { params: Promise.resolve({ id: milestone.id }) })).status, 403);
    assert.equal((await submit(await requestFor(otherContributor, `${path}/submit?workspaceId=${workspace.id}`, { summary: "Other contributor cannot submit." }), { params: Promise.resolve({ id: milestone.id }) })).status, 403);
    assert.equal((await db.milestone.findUnique({ where: { id: milestone.id } }))?.status, "pending");

    assert.equal((await submit(await requestFor(assignee, `${path}/submit?workspaceId=${workspace.id}`, { summary: "Initial work for review." }), { params: Promise.resolve({ id: milestone.id }) })).status, 201);
    assert.equal((await approve(await requestFor(reviewer, `${path}/approve?workspaceId=${workspace.id}`), { params: Promise.resolve({ id: milestone.id }) })).status, 403);
    assert.equal((await reject(await requestFor(reviewer, `${path}/reject?workspaceId=${workspace.id}`, { comment: "Legacy reviewer cannot decide." }), { params: Promise.resolve({ id: milestone.id }) })).status, 403);
    assert.equal((await approve(await requestFor(assignee, `${path}/approve?workspaceId=${workspace.id}`), { params: Promise.resolve({ id: milestone.id }) })).status, 403);
    assert.equal((await reject(await requestFor(otherContributor, `${path}/reject?workspaceId=${workspace.id}`, { comment: "Not authorized." }), { params: Promise.resolve({ id: milestone.id }) })).status, 403);
    assert.equal((await db.milestone.findUnique({ where: { id: milestone.id } }))?.status, "submitted");

    assert.equal((await reject(await requestFor(owner, `${path}/reject?workspaceId=${workspace.id}`, { comment: "" }), { params: Promise.resolve({ id: milestone.id }) })).status, 400);
    assert.equal((await reject(await requestFor(owner, `${path}/reject?workspaceId=${workspace.id}`, { comment: "Please include the source files." }), { params: Promise.resolve({ id: milestone.id }) })).status, 200);
    assert.equal((await db.milestone.findUnique({ where: { id: milestone.id } }))?.status, "rejected");

    assert.equal((await submit(await requestFor(owner, `${path}/submit?workspaceId=${workspace.id}`, { summary: "Owner still cannot resubmit." }), { params: Promise.resolve({ id: milestone.id }) })).status, 403);
    assert.equal((await submit(await requestFor(assignee, `${path}/submit?workspaceId=${workspace.id}`, { summary: "Source files added." }), { params: Promise.resolve({ id: milestone.id }) })).status, 201);
    assert.equal((await approve(await requestFor(owner, `${path}/approve?workspaceId=${workspace.id}`), { params: Promise.resolve({ id: milestone.id }) })).status, 200);
    assert.equal((await db.milestone.findUnique({ where: { id: milestone.id } }))?.status, "approved");
    assert.equal(await db.milestoneSubmission.count({ where: { milestoneId: milestone.id } }), 2);
  } finally {
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, reviewer.id, assignee.id, otherContributor.id] } } });
  }
});
