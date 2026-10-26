import assert from "node:assert/strict";
import test from "node:test";

import { PUT as updateSettings } from "@/app/api/v1/settings/route";
import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

test("workspace settings mutations use the selected owner workspace only", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Settings Owner", email: `settings-owner-${suffix}@example.com` } });
  const contributor = await db.user.create({ data: { displayName: "Settings Contributor", email: `settings-contributor-${suffix}@example.com` } });
  const workspaceA = await db.workspace.create({ data: { name: "Settings A", slug: `settings-a-${suffix}` } });
  const workspaceB = await db.workspace.create({ data: { name: "Settings B", slug: `settings-b-${suffix}` } });

  try {
    await db.workspaceMember.createMany({ data: [
      { workspaceId: workspaceA.id, userId: owner.id, role: "owner" },
      { workspaceId: workspaceB.id, userId: owner.id, role: "owner" },
      { workspaceId: workspaceA.id, userId: contributor.id, role: "contributor" },
    ] });
    const ownerToken = await createSessionToken({ userId: owner.id, email: owner.email!, name: owner.displayName, address: null, authType: "web2_google" });
    const contributorToken = await createSessionToken({ userId: contributor.id, email: contributor.email!, name: contributor.displayName, address: null, authType: "web2_google" });
    const headersFor = (token: string) => ({ cookie: `sf_session=${token}`, "content-type": "application/json" });

    const ownerUpdate = await updateSettings(new Request(`https://settleflow.local/api/v1/settings?workspaceId=${workspaceA.id}`, {
      method: "PUT", headers: headersFor(ownerToken), body: JSON.stringify({ webhookUrl: "https://hooks.example.test/a", notifyOnRelease: false }),
    }));
    assert.equal(ownerUpdate.status, 200);
    assert.equal((await db.workspace.findUniqueOrThrow({ where: { id: workspaceA.id } })).webhookUrl, "https://hooks.example.test/a");
    const untouchedB = await db.workspace.findUniqueOrThrow({ where: { id: workspaceB.id } });
    assert.equal(untouchedB.webhookUrl, null);
    assert.equal(untouchedB.notifyOnRelease, true);

    const contributorUpdate = await updateSettings(new Request(`https://settleflow.local/api/v1/settings?workspaceId=${workspaceA.id}`, {
      method: "PUT", headers: headersFor(contributorToken), body: JSON.stringify({ webhookUrl: "https://hooks.example.test/forbidden", notifyOnRelease: true }),
    }));
    assert.equal(contributorUpdate.status, 403);
    const unchangedA = await db.workspace.findUniqueOrThrow({ where: { id: workspaceA.id } });
    assert.equal(unchangedA.webhookUrl, "https://hooks.example.test/a");
    assert.equal(unchangedA.notifyOnRelease, false);
  } finally {
    await db.workspaceMember.deleteMany({ where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } });
    await db.workspace.deleteMany({ where: { id: { in: [workspaceA.id, workspaceB.id] } } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, contributor.id] } } });
  }
});
