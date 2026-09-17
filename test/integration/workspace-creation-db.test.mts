import assert from "node:assert/strict";
import test from "node:test";

import { POST as createWorkspace } from "@/app/api/v1/workspaces/route";
import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

function request(token: string, name: string) {
  return new Request("https://settleflow.local/api/v1/workspaces", {
    method: "POST",
    headers: { cookie: `sf_session=${token}`, "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

test("an authenticated account creates exactly one owner workspace atomically", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({ data: { displayName: "Workspace Creator", email: `workspace-creator-${suffix}@example.test` } });
  const token = await createSessionToken({ userId: user.id, email: user.email!, name: user.displayName, address: null, authType: "web2_google" });

  try {
    const [first, second] = await Promise.all([
      createWorkspace(request(token, "Creator Workspace")),
      createWorkspace(request(token, "Creator Workspace")),
    ]);
    const responses = [first, second];
    assert.equal(responses.filter((response) => response.status === 201).length, 1);
    assert.equal(responses.filter((response) => response.status === 409).length, 1);

    const created = await responses.find((response) => response.status === 201)!.json() as { workspace: { id: string; name: string; slug: string } };
    assert.equal(created.workspace.name, "Creator Workspace");
    assert.match(created.workspace.slug, /^creator-workspace-[a-f0-9]{8}$/);
    assert.match(responses.find((response) => response.status === 201)!.headers.get("set-cookie") ?? "", /sf_workspace_id=/);

    const memberships = await db.workspaceMember.findMany({ where: { userId: user.id } });
    assert.deepEqual(memberships.map((membership) => ({ workspaceId: membership.workspaceId, role: membership.role })), [
      { workspaceId: created.workspace.id, role: "owner" },
    ]);
  } finally {
    const workspaceIds = (await db.workspaceMember.findMany({ where: { userId: user.id }, select: { workspaceId: true } })).map((membership) => membership.workspaceId);
    await db.workspaceMember.deleteMany({ where: { userId: user.id } });
    await db.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    await db.user.delete({ where: { id: user.id } });
  }
});

test("workspace creation requires an authenticated session", async () => {
  const response = await createWorkspace(new Request("https://settleflow.local/api/v1/workspaces", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Unauthenticated Workspace" }),
  }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "AUTH_REQUIRED");
});
