import assert from "node:assert/strict";
import test from "node:test";

import { DELETE, POST } from "@/app/api/v1/push-subscriptions/route";
import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

test("push subscriptions require the active user and an authorized workspace", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({ data: { displayName: "Push Subscription User", email: `push-user-${suffix}@example.com` } });
  const workspace = await db.workspace.create({ data: { name: "Push Subscription Workspace", slug: `push-workspace-${suffix}` } });
  const otherWorkspace = await db.workspace.create({ data: { name: "Other Push Workspace", slug: `other-push-workspace-${suffix}` } });
  const endpoint = `https://push.example.test/subscriptions/${suffix}`;
  const body = { endpoint, keys: { p256dh: "p256dh-key", auth: "auth-key" } };

  try {
    await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "owner" } });
    const token = await createSessionToken({ userId: user.id, email: user.email!, name: user.displayName, address: null, authType: "web2_google" });
    const requestFor = (workspaceId: string, payload = body) => new Request(
      `https://settleflow.local/api/v1/push-subscriptions?workspaceId=${workspaceId}`,
      { method: "POST", headers: { cookie: `sf_session=${token}`, "content-type": "application/json" }, body: JSON.stringify(payload) },
    );

    const unauthenticated = await POST(new Request("https://settleflow.local/api/v1/push-subscriptions", { method: "POST", body: JSON.stringify(body) }));
    assert.equal(unauthenticated.status, 401);

    const invalid = await POST(requestFor(workspace.id, { endpoint: "http://invalid.test", keys: { p256dh: "key", auth: "key" } }));
    assert.equal(invalid.status, 400);

    const forbidden = await POST(requestFor(otherWorkspace.id));
    assert.equal(forbidden.status, 403);

    const created = await POST(requestFor(workspace.id));
    assert.equal(created.status, 201);
    assert.equal(await db.pushSubscription.count({ where: { workspaceId: workspace.id, userId: user.id, endpoint } }), 1);

    const deleted = await DELETE(new Request("https://settleflow.local/api/v1/push-subscriptions", {
      method: "DELETE",
      headers: { cookie: `sf_session=${token}`, "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }));
    assert.equal(deleted.status, 200);
    assert.equal(await db.pushSubscription.count({ where: { endpoint } }), 0);
  } finally {
    await db.pushSubscription.deleteMany({ where: { userId: user.id } });
    await db.workspaceMember.deleteMany({ where: { userId: user.id } });
    await db.workspace.deleteMany({ where: { id: { in: [workspace.id, otherWorkspace.id] } } });
    await db.user.delete({ where: { id: user.id } });
  }
});
