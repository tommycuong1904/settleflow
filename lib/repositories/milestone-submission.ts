import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { recordActivity } from "@/lib/repositories/activity-log";
import {
  dispatchWorkspaceWebhookNotification,
  type WebhookPayload,
} from "@/lib/notifications/webhook-dispatcher";

export type SubmitMilestoneInput = {
  authenticatedUserId: string;
  summary: string;

  artifactUrl?: string;
  artifactLabel?: string;
  notes?: string;
};

type SubmissionStatusUpdate = {
  status: "submitted";
  submittedAt: Date;
  approvedAt: null;
  rejectedAt: null;
  releasedAt: null;
};

export function deriveMilestoneSubmissionUpdate(
  submittedAt: Date,
): SubmissionStatusUpdate {
  return {
    status: "submitted",
    submittedAt,
    approvedAt: null,
    rejectedAt: null,
    releasedAt: null,
  };
}

export async function submitMilestone(
  milestoneId: string,
  workspaceId: string,
  input: SubmitMilestoneInput,
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
            title: true,
            workspaceId: true,
            contributor: { select: { linkedUserId: true } },
          },
        },
      },
    });
    if (!milestone) throw new Error("MILESTONE_NOT_FOUND");

    if (milestone.status !== "pending" && milestone.status !== "rejected") {
      throw new Error("MILESTONE_NOT_SUBMITTABLE");
    }

    const submitter = await tx.user.findUnique({ where: { id: input.authenticatedUserId }, select: { id: true } });
    if (!submitter) throw new Error("USER_NOT_FOUND");

    const matchesLinkedUserId = Boolean(
      milestone.payout.contributor.linkedUserId &&
      milestone.payout.contributor.linkedUserId === input.authenticatedUserId
    );

    if (!matchesLinkedUserId) {
      throw new Error("USER_NOT_ALLOWED_TO_SUBMIT");
    }

    const previousCount = await tx.milestoneSubmission.count({ where: { milestoneId } });
    const submission = await tx.milestoneSubmission.create({
      data: {
        milestoneId,
        submittedByUserId: input.authenticatedUserId,
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
      data: deriveMilestoneSubmissionUpdate(submission.submittedAt),
      select: { id: true, status: true },
    });
    await recordActivity(tx, {
      workspaceId: milestone.payout.workspaceId,
      actorUserId: input.authenticatedUserId,
      entityType: "milestone",
      entityId: milestoneId,
      milestoneId,
      action: "milestone_submitted",
      metadata: {
        submissionId: submission.id,
        summary: input.summary,
      },
    });
    return {
      milestone: updatedMilestone,
      submission,
      payoutTitle: milestone.payout.title,
      milestoneTitle: milestone.title,
      amountUsdc: milestone.amountUsdc.toString(),
    };
  });

  // Non-blocking Webhook dispatch
  void notify({
    event: "milestone_submitted",
    payoutTitle: result.payoutTitle,
    milestoneTitle: result.milestoneTitle,
    amountUsdc: result.amountUsdc,
    artifactUrl: input.artifactUrl,
    summary: input.summary,
  });

  return { milestone: result.milestone, submission: result.submission };
}

