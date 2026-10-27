import assert from "node:assert/strict";
import test from "node:test";

import { db } from "@/lib/db/client";
import { submitMilestone } from "@/lib/repositories/milestone-submission";
import { reviewMilestone } from "@/lib/repositories/milestone-review";
import { getPayoutDetail } from "@/lib/repositories/payouts";

test("milestone submission and requested changes notify recipients and expose feedback", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Workflow Owner", email: `workflow-owner-${suffix}@example.com` } });
  const contributorUser = await db.user.create({ data: { displayName: "Workflow Contributor", email: `workflow-contributor-${suffix}@example.com` } });
  const unrelatedUser = await db.user.create({ data: { displayName: "Workflow Other", email: `workflow-other-${suffix}@example.com` } });
  const workspace = await db.workspace.create({ data: { name: "Workflow Notification Workspace", slug: `workflow-notification-${suffix}` } });
  const contributor = await db.contributor.create({
    data: { workspaceId: workspace.id, linkedUserId: contributorUser.id, createdByUserId: owner.id, name: "Contributor", walletAddress: "0x1111111111111111111111111111111111111111" },
  });
  const payout = await db.payout.create({
    data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: owner.id, title: "Workflow payout", totalAmountUsdc: "10", status: "active", targetWalletAddress: contributor.walletAddress },
  });
  const milestone = await db.milestone.create({
    data: { payoutId: payout.id, title: "Workflow milestone", description: "Deliver work", amountUsdc: "10", sequence: 1 },
  });

  try {
    await db.workspaceMember.createMany({ data: [
      { workspaceId: workspace.id, userId: owner.id, role: "owner" },
      { workspaceId: workspace.id, userId: contributorUser.id, role: "contributor" },
    ] });

    await submitMilestone(milestone.id, workspace.id, { authenticatedUserId: contributorUser.id, summary: "Ready for review" }, () => undefined);
    assert.equal(await db.notification.count({ where: { workspaceId: workspace.id, userId: owner.id, type: "milestone_submitted" } }), 1);
    assert.equal(await db.notification.count({ where: { workspaceId: workspace.id, userId: contributorUser.id, type: "milestone_submitted" } }), 0);

    await reviewMilestone(milestone.id, owner.id, workspace.id, "rejected", "Add the final source link before resubmitting.", () => undefined);
    assert.equal(await db.notification.count({ where: { workspaceId: workspace.id, userId: owner.id, type: "milestone_rejected" } }), 0);
    assert.equal(await db.notification.count({ where: { workspaceId: workspace.id, userId: contributorUser.id, type: "milestone_rejected" } }), 1);
    assert.equal(await db.notification.count({ where: { workspaceId: workspace.id, userId: unrelatedUser.id } }), 0);

    const contributorDetail = await getPayoutDetail(payout.id, workspace.id, { linkedUserId: contributorUser.id });
    assert.equal(contributorDetail?.milestones[0]?.latestReview?.decision, "rejected");
    assert.equal(contributorDetail?.milestones[0]?.latestReview?.comment, "Add the final source link before resubmitting.");

    await submitMilestone(milestone.id, workspace.id, { authenticatedUserId: contributorUser.id, summary: "Updated work with the final source link" }, () => undefined);
    const ownerReviewNotifications = await db.notification.findMany({
      where: { workspaceId: workspace.id, userId: owner.id, type: "milestone_submitted" },
      orderBy: { createdAt: "asc" },
      select: { title: true, body: true },
    });
    assert.deepEqual(ownerReviewNotifications, [
      { title: "Milestone ready for review", body: "Workflow milestone was submitted for 10 USDC." },
      { title: "Updated work ready for review", body: "Workflow milestone was updated and resubmitted for review." },
    ]);
  } finally {
    await db.notification.deleteMany({ where: { workspaceId: workspace.id } });
    await db.milestoneReview.deleteMany({ where: { milestoneId: milestone.id } });
    await db.milestoneSubmission.deleteMany({ where: { milestoneId: milestone.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, contributorUser.id, unrelatedUser.id] } } });
  }
});
