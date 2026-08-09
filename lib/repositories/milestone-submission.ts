import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { recordActivity } from "@/lib/repositories/activity-log";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";

export type SubmitMilestoneInput = {
  contributorUserId: string;
  summary: string;
  artifactUrl?: string;
  artifactLabel?: string;
  notes?: string;
};

export async function submitMilestone(milestoneId: string, workspaceId: string, input: SubmitMilestoneInput) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const milestone = await tx.milestone.findUnique({
      where: { id: milestoneId },
      select: {
        id: true,
        status: true,
        payout: {
          select: {
            workspaceId: true,
            contributor: { select: { linkedUserId: true } },
          },
        },
      },
    });
    if (!milestone) throw new Error("MILESTONE_NOT_FOUND");
    if (milestone.payout.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");
    if (milestone.status !== "pending" && milestone.status !== "rejected") {
      throw new Error("MILESTONE_NOT_SUBMITTABLE");
    }

    const submitter = await tx.user.findUnique({ where: { id: input.contributorUserId }, select: { id: true } });
    if (!submitter) throw new Error("USER_NOT_FOUND");

    const isLinkedContributor = milestone.payout.contributor.linkedUserId === input.contributorUserId;
    const hasContributorRole = await hasWorkspaceRole(
      tx,
      milestone.payout.workspaceId,
      input.contributorUserId,
      ["owner", "ops", "contributor"],
    );
    if (!isLinkedContributor && !hasContributorRole) {
      throw new Error("USER_NOT_ALLOWED_TO_SUBMIT");
    }

    const previousCount = await tx.milestoneSubmission.count({ where: { milestoneId } });
    const submission = await tx.milestoneSubmission.create({
      data: {
        milestoneId,
        submittedByUserId: input.contributorUserId,
        summary: input.summary,
        artifactUrl: input.artifactUrl,
        artifactLabel: input.artifactLabel,
        notes: input.notes,
        resubmissionNumber: previousCount,
      },
      select: { id: true, submittedAt: true },
    });
    const updatedMilestone = await tx.milestone.update({
      where: { id: milestoneId },
      data: {
        status: "submitted",
        submittedAt: submission.submittedAt,
        approvedAt: null,
        rejectedAt: null,
        releasedAt: null,
      },
      select: { id: true, status: true },
    });
    await recordActivity(tx, {
      workspaceId: milestone.payout.workspaceId,
      actorUserId: input.contributorUserId,
      entityType: "milestone",
      entityId: milestoneId,
      milestoneId,
      action: "milestone_submitted",
      metadata: {
        submissionId: submission.id,
        summary: input.summary,
      },
    });
    return { milestone: updatedMilestone, submission };
  });
}
