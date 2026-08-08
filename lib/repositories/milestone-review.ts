import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";

export async function reviewMilestone(
  milestoneId: string,
  reviewedByUserId: string,
  decision: "approved" | "rejected",
  comment?: string,
) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const milestone = await tx.milestone.findUnique({
      where: { id: milestoneId },
      select: {
        id: true,
        status: true,
        payout: { select: { workspaceId: true } },
        submissions: { orderBy: { submittedAt: "desc" }, take: 1, select: { id: true } },
      },
    });
    if (!milestone) throw new Error("MILESTONE_NOT_FOUND");
    if (milestone.status !== "submitted" || milestone.submissions.length === 0) {
      throw new Error("MILESTONE_NOT_REVIEWABLE");
    }
    if (decision === "rejected" && (!comment || comment.trim().length === 0)) {
      throw new Error("REJECTION_COMMENT_REQUIRED");
    }
    const reviewer = await tx.user.findUnique({ where: { id: reviewedByUserId }, select: { id: true } });
    if (!reviewer) throw new Error("USER_NOT_FOUND");

    const hasReviewerRole = await hasWorkspaceRole(
      tx,
      milestone.payout.workspaceId,
      reviewedByUserId,
      ["owner", "ops", "reviewer"],
    );
    if (!hasReviewerRole) throw new Error("USER_NOT_ALLOWED_TO_REVIEW");

    const review = await tx.milestoneReview.create({
      data: {
        milestoneId,
        submissionId: milestone.submissions[0].id,
        reviewedByUserId,
        decision,
        comment,
      },
      select: { id: true, decision: true },
    });
    const updatedMilestone = await tx.milestone.update({
      where: { id: milestoneId },
      data: decision === "approved"
        ? { status: "approved", approvedAt: new Date() }
        : { status: "rejected", rejectedAt: new Date() },
      select: { id: true, status: true },
    });
    return { milestone: updatedMilestone, review };
  });
}
