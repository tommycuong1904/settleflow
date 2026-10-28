import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { GET as listMembers } from "@/app/api/v1/workspaces/[id]/members/route";
import { DELETE as removeMember } from "@/app/api/v1/workspaces/[id]/members/[userId]/route";

async function tokenFor(user: { id: string; email: string | null; displayName: string | null }) {
  return createSessionToken({ userId: user.id, email: user.email!, name: user.displayName ?? user.email!, address: null, authType: "web2_google" });
}

function request(url: string, token: string, method = "GET") {
  return new Request(url, { method, headers: { cookie: `sf_session=${token}` } });
}

test("workspace members are owner-only and only contributors can be removed", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Members Owner", email: `members-owner-${suffix}@example.com` } });
  const contributor = await db.user.create({ data: { displayName: "Members Contributor", email: `members-contributor-${suffix}@example.com` } });
  const reviewer = await db.user.create({ data: { displayName: "Members Reviewer", email: `members-reviewer-${suffix}@example.com` } });
  const workspace = await db.workspace.create({ data: { name: "Members Workspace", slug: `members-${suffix}` } });
  const otherWorkspace = await db.workspace.create({ data: { name: "Other Members Workspace", slug: `other-members-${suffix}` } });
  await db.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: owner.id, role: "owner" },
    { workspaceId: workspace.id, userId: contributor.id, role: "contributor" },
    { workspaceId: workspace.id, userId: reviewer.id, role: "reviewer" },
    { workspaceId: otherWorkspace.id, userId: owner.id, role: "owner" },
  ] });

  const workspaceParams = { params: Promise.resolve({ id: workspace.id }) };
  try {
    const ownerToken = await tokenFor(owner);
    const listed = await listMembers(request(`https://settleflow.local/api/v1/workspaces/${workspace.id}/members?workspaceId=${workspace.id}`, ownerToken), workspaceParams);
    assert.equal(listed.status, 200);
    assert.equal((await listed.json() as { data: unknown[] }).data.length, 3);

    const contributorList = await listMembers(request(`https://settleflow.local/api/v1/workspaces/${workspace.id}/members?workspaceId=${workspace.id}`, await tokenFor(contributor)), workspaceParams);
    assert.equal(contributorList.status, 403);
    assert.equal((await contributorList.json()).code, "FORBIDDEN_WORKSPACE_MEMBER_MANAGE_ACTOR");

    const crossWorkspace = await listMembers(request(`https://settleflow.local/api/v1/workspaces/${workspace.id}/members?workspaceId=${otherWorkspace.id}`, ownerToken), workspaceParams);
    assert.equal(crossWorkspace.status, 403);
    assert.equal((await crossWorkspace.json()).code, "WORKSPACE_ACCESS_DENIED");

    const removeParams = { params: Promise.resolve({ id: workspace.id, userId: contributor.id }) };
    const removed = await removeMember(request(`https://settleflow.local/api/v1/workspaces/${workspace.id}/members/${contributor.id}?workspaceId=${workspace.id}`, ownerToken, "DELETE"), removeParams);
    assert.equal(removed.status, 200);
    assert.equal(await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: contributor.id } } }), null);

    const ownerParams = { params: Promise.resolve({ id: workspace.id, userId: owner.id }) };
    const ownerRemoval = await removeMember(request(`https://settleflow.local/api/v1/workspaces/${workspace.id}/members/${owner.id}?workspaceId=${workspace.id}`, ownerToken, "DELETE"), ownerParams);
    assert.equal(ownerRemoval.status, 409);
    assert.equal((await ownerRemoval.json()).code, "WORKSPACE_MEMBER_REMOVAL_NOT_ALLOWED");
  } finally {
    await db.workspaceMember.deleteMany({ where: { workspaceId: { in: [workspace.id, otherWorkspace.id] } } });
    await db.workspace.deleteMany({ where: { id: { in: [workspace.id, otherWorkspace.id] } } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, contributor.id, reviewer.id] } } });
  }
});
