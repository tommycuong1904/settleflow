import { db } from "@/lib/db/client";
import type { ActivityItem } from "@/lib/models/activity-item";

function labelForUser(user?: { displayName: string | null; id: string } | null) {
  return user?.displayName?.trim() || user?.id || "System";
}

export async function getPayoutActivity(payoutId: string): Promise<ActivityItem[]> {
  const payout = await db.payout.findUnique({
    where: { id: payoutId },
    select: {
      id: true,
      createdAt: true,
      createdByUserId: true,
    },
  });

  if (!payout) return [];

  const [creator, milestones] = await Promise.all([
    db.user.findUnique({
      where: { id: payout.createdByUserId },
      select: { id: true, displayName: true },
    }),
    db.milestone.findMany({
      where: { payoutId },
      orderBy: { sequence: "asc" },
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  const milestoneIds = milestones.map((milestone) => milestone.id);

  const [submissions, reviews, releases] = milestoneIds.length
    ? await Promise.all([
        db.milestoneSubmission.findMany({
          where: { milestoneId: { in: milestoneIds } },
          orderBy: { submittedAt: "desc" },
          select: {
            id: true,
            milestoneId: true,
            summary: true,
            submittedAt: true,
            submittedBy: { select: { id: true, displayName: true } },
          },
        }),
        db.milestoneReview.findMany({
          where: { milestoneId: { in: milestoneIds } },
          orderBy: { reviewedAt: "desc" },
          select: {
            id: true,
            milestoneId: true,
            decision: true,
            comment: true,
            reviewedAt: true,
            reviewedBy: { select: { id: true, displayName: true } },
          },
        }),
        db.release.findMany({
          where: { payoutId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            milestoneId: true,
            status: true,
            amountUsdc: true,
            createdAt: true,
            executedAt: true,
            failedAt: true,
            failureReason: true,
            triggeredBy: { select: { id: true, displayName: true } },
            proofs: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                status: true,
                confirmedAt: true,
                failedAt: true,
                txHash: true,
                failureReason: true,
              },
            },
          },
        }),
      ])
    : [[], [], []];

  const milestoneMap = new Map(milestones.map((milestone) => [milestone.id, milestone]));
  const items: ActivityItem[] = [
    {
      id: `payout:${payout.id}:created`,
      entityType: "payout",
      entityId: payout.id,
      action: "payout_created",
      occurredAt: payout.createdAt.toISOString(),
      actorLabel: labelForUser(creator),
      title: "Payout created",
      description: "Initial payout draft was created.",
    },
  ];

  for (const submission of submissions) {
    const milestone = milestoneMap.get(submission.milestoneId);
    items.push({
      id: `submission:${submission.id}`,
      entityType: "milestone",
      entityId: submission.milestoneId,
      action: "milestone_submitted",
      occurredAt: submission.submittedAt.toISOString(),
      actorLabel: labelForUser(submission.submittedBy),
      title: `Submitted ${milestone?.title ?? "milestone"}`,
      description: submission.summary || "Contributor submitted milestone deliverables.",
    });
  }

  for (const review of reviews) {
    const milestone = milestoneMap.get(review.milestoneId);
    items.push({
      id: `review:${review.id}`,
      entityType: "milestone",
      entityId: review.milestoneId,
      action: review.decision === "approved" ? "milestone_approved" : "milestone_rejected",
      occurredAt: review.reviewedAt.toISOString(),
      actorLabel: labelForUser(review.reviewedBy),
      title: `${review.decision === "approved" ? "Approved" : "Rejected"} ${milestone?.title ?? "milestone"}`,
      description: review.comment || undefined,
    });
  }

  for (const release of releases) {
    const milestone = release.milestoneId ? milestoneMap.get(release.milestoneId) : undefined;
    items.push({
      id: `release:${release.id}:created`,
      entityType: "release",
      entityId: release.id,
      action: "release_queued",
      occurredAt: release.createdAt.toISOString(),
      actorLabel: labelForUser(release.triggeredBy),
      title: `Queued release for ${milestone?.title ?? "milestone"}`,
      description: `Requested ${release.amountUsdc.toString()} USDC via ${release.status} release flow.`,
    });

    if (release.executedAt) {
      items.push({
        id: `release:${release.id}:confirmed`,
        entityType: "release",
        entityId: release.id,
        action: "release_confirmed",
        occurredAt: release.executedAt.toISOString(),
        actorLabel: labelForUser(release.triggeredBy),
        title: `Confirmed release for ${milestone?.title ?? "milestone"}`,
        description: "Release execution reached confirmed state.",
      });
    }

    if (release.failedAt) {
      items.push({
        id: `release:${release.id}:failed`,
        entityType: "release",
        entityId: release.id,
        action: "release_failed",
        occurredAt: release.failedAt.toISOString(),
        actorLabel: labelForUser(release.triggeredBy),
        title: `Release failed for ${milestone?.title ?? "milestone"}`,
        description: release.failureReason || "Release execution failed.",
      });
    }

    const proof = release.proofs[0];
    if (proof?.confirmedAt) {
      items.push({
        id: `proof:${proof.id}:confirmed`,
        entityType: "proof",
        entityId: proof.id,
        action: "proof_confirmed",
        occurredAt: proof.confirmedAt.toISOString(),
        actorLabel: "System",
        title: `Settlement proof confirmed for ${milestone?.title ?? "milestone"}`,
        description: proof.txHash || undefined,
      });
    }

    if (proof?.failedAt) {
      items.push({
        id: `proof:${proof.id}:failed`,
        entityType: "proof",
        entityId: proof.id,
        action: "proof_failed",
        occurredAt: proof.failedAt.toISOString(),
        actorLabel: "System",
        title: `Settlement proof failed for ${milestone?.title ?? "milestone"}`,
        description: proof.failureReason || "Settlement proof marked as failed.",
      });
    }
  }

  return items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}
