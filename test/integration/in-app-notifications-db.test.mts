import assert from "node:assert/strict";
import test from "node:test";

import { db } from "@/lib/db/client";
import { createInAppNotifications } from "@/lib/repositories/notifications";

test("in-app notifications are workspace and recipient scoped", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Notification Owner", email: `notification-owner-${suffix}@example.com` } });
  const other = await db.user.create({ data: { displayName: "Notification Other", email: `notification-other-${suffix}@example.com` } });
  const workspace = await db.workspace.create({ data: { name: "Notification Workspace", slug: `notification-${suffix}` } });

  try {
    await db.$transaction((tx) => createInAppNotifications(tx, {
      workspaceId: workspace.id,
      userIds: [owner.id, owner.id],
      type: "milestone_submitted",
      title: "Milestone ready for review",
      body: "A contributor submitted work.",
      href: "/payouts/payout-1",
    }));

    assert.equal(await db.notification.count({ where: { workspaceId: workspace.id, userId: owner.id } }), 1);
    assert.equal(await db.notification.count({ where: { workspaceId: workspace.id, userId: other.id } }), 0);

    const marked = await db.notification.updateMany({
      where: { workspaceId: workspace.id, userId: owner.id, readAt: null },
      data: { readAt: new Date() },
    });
    assert.equal(marked.count, 1);
    assert.equal(await db.notification.count({ where: { workspaceId: workspace.id, userId: owner.id, readAt: null } }), 0);
  } finally {
    await db.notification.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
  }
});
