import assert from "node:assert/strict";
import test from "node:test";

import { db } from "@/lib/db/client";
import { ensureInitialWorkspaceForUser } from "@/lib/services/workspaces";

test("first sign-in bootstrap creates one owner workspace atomically and preserves existing memberships", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({ data: { displayName: "Bootstrap Creator", email: `bootstrap-${suffix}@example.test` } });
  const existingUser = await db.user.create({ data: { displayName: "Existing Member", email: `existing-bootstrap-${suffix}@example.test` } });
  const existingWorkspace = await db.workspace.create({ data: { name: "Existing Workspace", slug: `existing-bootstrap-${suffix}` } });

  try {
    await db.workspaceMember.create({ data: { workspaceId: existingWorkspace.id, userId: existingUser.id, role: "reviewer" } });

    const results = await Promise.all([
      db.$transaction((tx) => ensureInitialWorkspaceForUser(tx, { userId: user.id, displayName: user.displayName })),
      db.$transaction((tx) => ensureInitialWorkspaceForUser(tx, { userId: user.id, displayName: user.displayName })),
    ]);
    assert.equal(results.filter((result) => result.created).length, 1);
    assert.equal(new Set(results.map((result) => result.workspaceId)).size, 1);

    const memberships = await db.workspaceMember.findMany({ where: { userId: user.id } });
    assert.equal(memberships.length, 1);
    assert.equal(memberships[0].role, "owner");
    const workspace = await db.workspace.findUnique({ where: { id: memberships[0].workspaceId } });
    assert.equal(workspace?.name, "Bootstrap Creator's Workspace");

    const existingResult = await db.$transaction((tx) => ensureInitialWorkspaceForUser(tx, {
      userId: existingUser.id,
      displayName: existingUser.displayName,
    }));
    assert.deepEqual(existingResult, { workspaceId: existingWorkspace.id, created: false });
    assert.equal(await db.workspaceMember.count({ where: { userId: existingUser.id } }), 1);
    assert.equal((await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: existingWorkspace.id, userId: existingUser.id } },
    }))?.role, "reviewer");
  } finally {
    const workspaceIds = (await db.workspaceMember.findMany({ where: { userId: user.id }, select: { workspaceId: true } })).map((membership) => membership.workspaceId);
    await db.workspaceMember.deleteMany({ where: { userId: { in: [user.id, existingUser.id] } } });
    await db.workspace.deleteMany({ where: { id: { in: [...workspaceIds, existingWorkspace.id] } } });
    await db.user.deleteMany({ where: { id: { in: [user.id, existingUser.id] } } });
  }
});
