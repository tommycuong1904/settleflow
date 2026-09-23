import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { GET as listNotifications, PATCH as markAllNotificationsRead } from "@/app/api/v1/notifications/route";
import { PATCH as markNotificationRead } from "@/app/api/v1/notifications/[id]/route";

test("notification routes enforce the active user and workspace boundary", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Notification Route Owner", email: `notification-route-owner-${suffix}@example.com` } });
  const other = await db.user.create({ data: { displayName: "Notification Route Other", email: `notification-route-other-${suffix}@example.com` } });
  const workspace = await db.workspace.create({ data: { name: "Notification Route Workspace", slug: `notification-route-${suffix}` } });

  try {
    await db.workspaceMember.createMany({ data: [
      { workspaceId: workspace.id, userId: owner.id, role: "owner" },
      { workspaceId: workspace.id, userId: other.id, role: "contributor" },
    ] });
    const notification = await db.notification.create({
      data: { workspaceId: workspace.id, userId: owner.id, type: "milestone_submitted", title: "Review", body: "Review required", href: "/payouts/payout-1" },
    });
    const ownerToken = await createSessionToken({ userId: owner.id, email: owner.email!, name: owner.displayName, address: null, authType: "web2_google" });
    const otherToken = await createSessionToken({ userId: other.id, email: other.email!, name: other.displayName, address: null, authType: "web2_google" });
    const headersFor = (token: string) => ({ cookie: `sf_session=${token}` });

    const ownerResponse = await listNotifications(new Request(`https://settleflow.local/api/v1/notifications?workspaceId=${workspace.id}`, { headers: headersFor(ownerToken) }));
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json() as { unreadCount: number; notifications: Array<{ id: string }> };
    assert.equal(ownerBody.unreadCount, 1);
    assert.deepEqual(ownerBody.notifications.map((item) => item.id), [notification.id]);

    const otherResponse = await listNotifications(new Request(`https://settleflow.local/api/v1/notifications?workspaceId=${workspace.id}`, { headers: headersFor(otherToken) }));
    assert.equal(otherResponse.status, 200);
    assert.equal((await otherResponse.json() as { unreadCount: number }).unreadCount, 0);

    const params = { params: Promise.resolve({ id: notification.id }) };
    const rejected = await markNotificationRead(new Request(`https://settleflow.local/api/v1/notifications/${notification.id}?workspaceId=${workspace.id}`, { method: "PATCH", headers: headersFor(otherToken) }), params);
    assert.equal(rejected.status, 404);

    const marked = await markNotificationRead(new Request(`https://settleflow.local/api/v1/notifications/${notification.id}?workspaceId=${workspace.id}`, { method: "PATCH", headers: headersFor(ownerToken) }), params);
    assert.equal(marked.status, 200);
    assert.notEqual((await db.notification.findUnique({ where: { id: notification.id } }))?.readAt, null);

    const unreadNotification = await db.notification.create({
      data: { workspaceId: workspace.id, userId: owner.id, type: "release_confirmed", title: "Payment confirmed", body: "Payment completed", href: "/payouts/payout-1" },
    });
    const markedAll = await markAllNotificationsRead(new Request(`https://settleflow.local/api/v1/notifications?workspaceId=${workspace.id}`, { method: "PATCH", headers: headersFor(ownerToken) }));
    assert.equal(markedAll.status, 200);
    assert.notEqual((await db.notification.findUnique({ where: { id: unreadNotification.id } }))?.readAt, null);
  } finally {
    await db.notification.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
  }
});
