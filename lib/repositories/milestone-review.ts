import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { recordActivity } from "@/lib/repositories/activity-log";
import { createInAppNotifications } from "@/lib/repositories/notifications";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";
import {
  dispatchWorkspaceWebhookNotification,
  type WebhookPayload,
} from "@/lib/notifications/webhook-dispatcher";

type ReviewDecisionUpdate = {
  status: "approved" | "rejected";
  approvedAt: Date | null;
  rejectedAt: Date | null;
  releasedAt?: Date | null;
};

export function deriveMilestoneReviewUpdate(
  decision: "approved" | "rejected",
  reviewedAt = new Date(),
): ReviewDecisionUpdate {
  return decision === "approved"
    ? {
        status: "approved",
        approvedAt: reviewedAt,
        rejectedAt: null,
      }
    : {
        status: "rejected",
        approvedAt: null,
        rejectedAt: reviewedAt,
        releasedAt: null,
      };
}

export async function reviewMilestone(
  milestoneId: string,
  reviewerUserId: string,
  workspaceId: string,
  decision: "approved" | "rejected",
  comment?: string,
  notify: (payload: WebhookPayload) => void = (payload) => {
    void dispatchWorkspaceWebhookNotification(workspaceId, payload);
  },
) {
  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT id FROM "Milestone" WHERE id = ${milestoneId} FOR UPDATE`;
    const milestone = await tx.milestone.findFirst({
      where: { id: milestoneId, payout: { workspaceId } },
      select: {
        id: true,
        title: true,
        amountUsdc: true,
        status: true,
        payout: {
          select: {
            id: true,
            title: true,
            workspaceId: true,
            contributor: { select: { linkedUserId: true } },
          },
        },
        submissions: { orderBy: { submittedAt: "desc" }, take: 1, select: { id: true } },
      },
    });
    if (!milestone) throw new Error("MILESTONE_NOT_FOUND");
    if (milestone.payout.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");
    if (milestone.status !== "submitted" || milestone.submissions.length === 0) {
      throw new Error("MILESTONE_NOT_REVIEWABLE");
    }
    if (decision === "rejected" && (!comment || comment.trim().length === 0)) {
      throw new Error("REJECTION_COMMENT_REQUIRED");
    }
    const reviewer = await tx.user.findUnique({ where: { id: reviewerUserId }, select: { id: true } });
    if (!reviewer) throw new Error("USER_NOT_FOUND");

    const hasOwnerRole = await hasWorkspaceRole(
      tx,
      milestone.payout.workspaceId,
      reviewerUserId,
      ["owner"],
    );
    if (!hasOwnerRole) throw new Error("USER_NOT_ALLOWED_TO_REVIEW");

    const review = await tx.milestoneReview.create({
      data: {
        milestoneId,
        submissionId: milestone.submissions[0].id,
        reviewedByUserId: reviewerUserId,
        decision,
        comment,
      },
      select: { id: true, decision: true },
    });
    const reviewedAt = new Date();
    const updatedMilestone = await tx.milestone.update({
      where: { id: milestoneId },
      data: deriveMilestoneReviewUpdate(decision, reviewedAt),
      select: {
        id: true,
        status: true,
        approvedAt: true,
        rejectedAt: true,
      },
    });
    await recordActivity(tx, {
      workspaceId: milestone.payout.workspaceId,
      actorUserId: reviewerUserId,
      entityType: "milestone",
      entityId: milestoneId,
      milestoneId,
      action: decision === "approved" ? "milestone_approved" : "milestone_rejected",
      metadata: {
        reviewId: review.id,
        comment: comment ?? undefined,
      },
    });
    const recipientIds = [milestone.payout.contributor.linkedUserId];
    if (decision === "approved") recipientIds.push(reviewerUserId);
    await createInAppNotifications(tx, {
      workspaceId,
      userIds: recipientIds.filter((id): id is string => Boolean(id)),
      type: decision === "approved" ? "milestone_approved" : "milestone_rejected",
      title: decision === "approved" ? "Milestone approved" : "Revision requested",
      body: decision === "approved"
        ? `${milestone.title} is approved and ready for Web3 release.`
        : `${milestone.title} needs updates before it can be approved.${comment ? ` Feedback: ${comment}` : ""}`,
      href: `/payouts/${milestone.payout.id}`,
    });
    return {
      milestone: updatedMilestone,
      review,
      payoutTitle: milestone.payout.title,
      milestoneTitle: milestone.title,
      amountUsdc: milestone.amountUsdc.toString(),
    };
  });

  // Non-blocking Webhook dispatch
  void notify({
    event: decision === "approved" ? "milestone_approved" : "milestone_rejected",
    payoutTitle: result.payoutTitle,
    milestoneTitle: result.milestoneTitle,
    amountUsdc: result.amountUsdc,
    comment,
  });

  return { milestone: result.milestone, review: result.review };
}
