import { db } from "@/lib/db/client";
import type { ActivityItem } from "@/lib/models/activity-item";

export type ActivityViewRole = "owner" | "reviewer" | "contributor" | "ops";
export type OwnerActivity = ActivityItem;
export type ContributorActivity = ActivityItem;
export type ReviewerActivity = {
  id: string;
  entityType: "milestone";
  entityId: string;
  action: "milestone_submitted" | "milestone_approved" | "milestone_rejected";
  occurredAt: string;
  title: "Milestone review activity";
};
export type OpsActivity = {
  id: string;
  entityType: "release" | "proof";
  entityId: string;
  action: string;
  occurredAt: string;
  title: "Settlement operation";
  description?: "Settlement operation failed.";
};

export function projectActivity(item: ActivityItem, role: ActivityViewRole): OwnerActivity | ContributorActivity | ReviewerActivity | OpsActivity {
  if (role === "owner" || role === "contributor") return item;
  if (role === "reviewer") {
    const action: ReviewerActivity["action"] = item.action === "milestone_approved" || item.action === "milestone_rejected"
      ? item.action
      : "milestone_submitted";
    return { id: item.id, entityType: "milestone", entityId: item.entityId, action, occurredAt: item.occurredAt, title: "Milestone review activity" };
  }
  return { id: item.id, entityType: item.entityType === "proof" ? "proof" : "release", entityId: item.entityId, action: item.action, occurredAt: item.occurredAt, title: "Settlement operation", ...(item.action.includes("failed") ? { description: "Settlement operation failed." } : {}) };
}

function labelForUser(user?: { displayName: string | null; id: string } | null) {
  return user?.displayName?.trim() || user?.id || "System";
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function getLogTitle(action: string, milestoneTitle?: string) {
  switch (action) {
    case "payout_created":
      return "Payout created";
    case "payout_activated":
      return "Payout activated";
    case "payout_draft_updated":
      return "Payout draft updated";
    case "milestone_submitted":
      return `Submitted ${milestoneTitle ?? "milestone"}`;
    case "milestone_approved":
      return `Approved ${milestoneTitle ?? "milestone"}`;
    case "milestone_rejected":
      return `Rejected ${milestoneTitle ?? "milestone"}`;
    case "release_queued":
      return `Queued release for ${milestoneTitle ?? "milestone"}`;
    case "release_retried":
      return `Retried release for ${milestoneTitle ?? "milestone"}`;
    case "release_failed":
      return `Release failed for ${milestoneTitle ?? "milestone"}`;
    case "release_confirmed":
      return `Confirmed release for ${milestoneTitle ?? "milestone"}`;
    case "proof_failed":
      return `Settlement proof failed for ${milestoneTitle ?? "milestone"}`;
    case "proof_confirmed":
      return `Settlement proof confirmed for ${milestoneTitle ?? "milestone"}`;
    default:
      return action.replaceAll("_", " ");
  }
}

function getLogDescription(action: string, metadata?: Record<string, unknown>) {
  switch (action) {
    case "payout_created":
      return "Initial payout draft was created.";
    case "payout_activated":
      return "Payout moved from draft to active state.";
    case "payout_draft_updated": {
      const changedFields = metadata?.changedFields;
      const headerChangedFields = metadata?.headerChangedFields;
      const milestonesChanged = asText(metadata?.milestonesChanged) === "true";
      const milestoneCount = asText(metadata?.milestoneCount);

      if (Array.isArray(headerChangedFields) && headerChangedFields.length > 0 && milestonesChanged) {
        return `Updated payout fields (${headerChangedFields.join(", ")}) and reshaped ${milestoneCount ?? "the"} milestone draft${milestoneCount === "1" ? "" : "s"}.`;
      }
      if (Array.isArray(headerChangedFields) && headerChangedFields.length > 0) {
        return `Updated payout fields: ${headerChangedFields.join(", ")}.`;
      }
      if (milestonesChanged) {
        return `Updated ${milestoneCount ?? "the"} milestone draft${milestoneCount === "1" ? "" : "s"}.`;
      }
      if (Array.isArray(changedFields) && changedFields.length > 0) {
        return `Updated fields: ${changedFields.join(", ")}.`;
      }
      return "Draft payout details were updated.";
    }
    case "milestone_submitted":
      return "Milestone deliverables were submitted.";
    case "milestone_approved":
    case "milestone_rejected":
      return undefined;
    case "release_queued": {
      return "Release was queued.";
    }
    case "release_retried": {
      return "Release retry was queued.";
    }
    case "release_failed":
    case "proof_failed":
      return "Execution failed.";
    case "proof_confirmed":
      return "Settlement proof confirmed.";
    default:
      return undefined;
  }
}

async function getLoggedPayoutActivity(payoutId: string, workspaceId: string, scope?: { linkedUserId?: string; createdByUserId?: string }): Promise<ActivityItem[]> {
  const [logs, milestones] = await Promise.all([
    db.activityLog.findMany({
      where: {
        payoutId,
        workspaceId,
        ...(scope?.linkedUserId || scope?.createdByUserId
          ? {
              payout: {
                ...(scope.linkedUserId ? { contributor: { linkedUserId: scope.linkedUserId } } : {}),
                ...(scope.createdByUserId ? { createdByUserId: scope.createdByUserId } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        occurredAt: true,
        milestoneId: true,
        actorUser: { select: { id: true, displayName: true } },
        metadataJson: true,
      },
    }),
    db.milestone.findMany({
      where: { payoutId, payout: { workspaceId } },
      select: { id: true, title: true },
    }),
  ]);

  if (logs.length === 0) return [];

  const milestoneMap = new Map(milestones.map((milestone) => [milestone.id, milestone.title]));

  return logs.map((log) => {
    const metadata = log.metadataJson && typeof log.metadataJson === "object" && !Array.isArray(log.metadataJson)
      ? (log.metadataJson as Record<string, unknown>)
      : undefined;
    const milestoneTitle = log.milestoneId ? milestoneMap.get(log.milestoneId) : undefined;

    return {
      id: `log:${log.id}`,
      entityType: ["payout", "milestone", "release", "proof"].includes(log.entityType)
        ? (log.entityType as ActivityItem["entityType"])
        : "system",
      entityId: log.entityId,
      action: log.action,
      occurredAt: log.occurredAt.toISOString(),
      actorLabel: labelForUser(log.actorUser),
      title: getLogTitle(log.action, milestoneTitle),
      description: getLogDescription(log.action, metadata),
      metadata: metadata
        ? Object.fromEntries(
            Object.entries(metadata).map(([key, value]) => [key, value == null ? undefined : String(value)]),
          )
        : undefined,
    } satisfies ActivityItem;
  });
}

async function getDerivedPayoutActivity(payoutId: string, workspaceId: string, scope?: { linkedUserId?: string; createdByUserId?: string }): Promise<ActivityItem[]> {
  const payout = await db.payout.findFirst({
    where: {
      id: payoutId,
      workspaceId,
      ...(scope?.linkedUserId ? { contributor: { linkedUserId: scope.linkedUserId } } : {}),
      ...(scope?.createdByUserId ? { createdByUserId: scope.createdByUserId } : {}),
    },
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
      where: { payoutId, payout: { workspaceId } },
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
          where: { milestone: { id: { in: milestoneIds }, payout: { workspaceId } } },
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
          where: { milestone: { id: { in: milestoneIds }, payout: { workspaceId } } },
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
          where: { payoutId, payout: { workspaceId } },
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

function getActivityDedupKey(item: ActivityItem) {
  return [item.action, item.entityType, item.entityId].join(":");
}

async function getRestrictedPayoutActivity(
  payoutId: string,
  workspaceId: string,
  role: "reviewer" | "ops",
  scope?: { linkedUserId?: string; createdByUserId?: string },
): Promise<ReviewerActivity[] | OpsActivity[]> {
  const logs = await db.activityLog.findMany({
    where: { payoutId, workspaceId, ...(scope?.linkedUserId ? { payout: { contributor: { linkedUserId: scope.linkedUserId } } } : {}), ...(scope?.createdByUserId ? { payout: { createdByUserId: scope.createdByUserId } } : {}) },
    orderBy: { occurredAt: "desc" },
    select: { id: true, entityId: true, action: true, occurredAt: true, milestoneId: true },
  });
  if (role === "reviewer") return logs
    .filter((log) => log.action === "milestone_submitted" || log.action === "milestone_approved" || log.action === "milestone_rejected")
    .map((log) => ({ id: `log:${log.id}`, entityType: "milestone" as const, entityId: log.milestoneId ?? log.entityId, action: log.action as ReviewerActivity["action"], occurredAt: log.occurredAt.toISOString(), title: "Milestone review activity" as const }));
  return logs
    .filter((log) => log.action === "release_queued" || log.action === "release_retried" || log.action === "release_failed" || log.action === "proof_failed" || log.action === "proof_confirmed")
    .map((log) => ({ id: `log:${log.id}`, entityType: log.action.startsWith("proof_") ? "proof" as const : "release" as const, entityId: log.entityId, action: log.action, occurredAt: log.occurredAt.toISOString(), title: "Settlement operation" as const, ...(log.action.includes("failed") ? { description: "Settlement operation failed." as const } : {}) }));
}

export async function getPayoutActivity(
  payoutId: string,
  workspaceId: string,
  scope?: { linkedUserId?: string; createdByUserId?: string },
  role: ActivityViewRole = "owner",
): Promise<Array<OwnerActivity | ContributorActivity | ReviewerActivity | OpsActivity>> {
  if (role === "reviewer" || role === "ops") return getRestrictedPayoutActivity(payoutId, workspaceId, role, scope);
  const [logged, derived] = await Promise.all([
    getLoggedPayoutActivity(payoutId, workspaceId, scope),
    getDerivedPayoutActivity(payoutId, workspaceId, scope),
  ]);

  const merged = new Map<string, ActivityItem>();

  for (const item of derived) {
    merged.set(getActivityDedupKey(item), item);
  }

  for (const item of logged) {
    merged.set(getActivityDedupKey(item), item);
  }

  return Array.from(merged.values()).map((item) => projectActivity(item, role)).sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

export async function getWorkspaceActivity(workspaceId: string, role: ActivityViewRole = "owner", linkedUserId?: string): Promise<Array<OwnerActivity | ContributorActivity | ReviewerActivity | OpsActivity>> {
  if (role === "reviewer" || role === "ops") {
    const logs = await db.activityLog.findMany({ where: { workspaceId }, orderBy: { occurredAt: "desc" }, take: 50, select: { id: true, entityId: true, action: true, occurredAt: true, milestoneId: true } });
    if (role === "reviewer") return logs.filter((l) => l.action.startsWith("milestone_")).map((l) => ({ id: `log:${l.id}`, entityType: "milestone" as const, entityId: l.milestoneId ?? l.entityId, action: l.action as ReviewerActivity["action"], occurredAt: l.occurredAt.toISOString(), title: "Milestone review activity" as const }));
    return logs.filter((l) => l.action.startsWith("release_") || l.action.startsWith("proof_")).map((l) => ({ id: `log:${l.id}`, entityType: l.action.startsWith("proof_") ? "proof" as const : "release" as const, entityId: l.entityId, action: l.action, occurredAt: l.occurredAt.toISOString(), title: "Settlement operation" as const, ...(l.action.includes("failed") ? { description: "Settlement operation failed." as const } : {}) }));
  }
  const payoutScope = linkedUserId ? { contributor: { linkedUserId } } : undefined;
  const [logs, proofs] = await Promise.all([
    db.activityLog.findMany({
      where: { workspaceId, ...(payoutScope ? { payout: payoutScope } : {}) },
      orderBy: { occurredAt: "desc" },
      take: 50,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        occurredAt: true,
        milestoneId: true,
        payoutId: true,
        actorUser: { select: { id: true, displayName: true } },
        metadataJson: true,
      },
    }),
    db.transactionProof.findMany({
      where: { payout: { workspaceId, ...(linkedUserId ? payoutScope : {}) } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        milestoneId: true,
        payoutId: true,
        txHash: true,
        network: true,
        status: true,
        explorerUrl: true,
        confirmedAt: true,
        failedAt: true,
        createdAt: true,
        milestone: { select: { title: true } },
      },
    }),
  ]);

  const milestoneIds = logs.map((l) => l.milestoneId).filter((id): id is string => Boolean(id));
  const milestones = milestoneIds.length
    ? await db.milestone.findMany({
        where: { id: { in: milestoneIds }, payout: { workspaceId, ...(linkedUserId ? payoutScope : {}) } },
        select: { id: true, title: true },
      })
    : [];
  const milestoneMap = new Map(milestones.map((m) => [m.id, m.title]));

  const items: ActivityItem[] = logs.map((log) => {
    const metadata =
      log.metadataJson && typeof log.metadataJson === "object" && !Array.isArray(log.metadataJson)
        ? (log.metadataJson as Record<string, unknown>)
        : undefined;
    const milestoneTitle = log.milestoneId ? milestoneMap.get(log.milestoneId) : undefined;

    return {
      id: `log:${log.id}`,
      entityType: ["payout", "milestone", "release", "proof"].includes(log.entityType)
        ? (log.entityType as ActivityItem["entityType"])
        : "system",
      entityId: log.entityId,
      action: log.action,
      occurredAt: log.occurredAt.toISOString(),
      actorLabel: labelForUser(log.actorUser),
      title: getLogTitle(log.action, milestoneTitle),
      description: getLogDescription(log.action, metadata),
      metadata: metadata
        ? Object.fromEntries(
            Object.entries(metadata).map(([key, value]) => [key, value == null ? undefined : String(value)]),
          )
        : undefined,
    };
  });

  for (const proof of proofs) {
    if (proof.confirmedAt) {
      items.push({
        id: `proof:${proof.id}:confirmed`,
        entityType: "proof",
        entityId: proof.id,
        action: "proof_confirmed",
        occurredAt: proof.confirmedAt.toISOString(),
        actorLabel: "System",
        title: `Settlement proof confirmed for ${proof.milestone?.title ?? "milestone"}`,
        description: proof.txHash || "Confirmed on Arc Testnet",
        metadata: {
          txHash: proof.txHash || undefined,
          network: proof.network || undefined,
          explorerUrl: proof.explorerUrl || undefined,
        },
      });
    } else if (proof.failedAt) {
      items.push({
        id: `proof:${proof.id}:failed`,
        entityType: "proof",
        entityId: proof.id,
        action: "proof_failed",
        occurredAt: proof.failedAt.toISOString(),
        actorLabel: "System",
        title: `Settlement proof failed for ${proof.milestone?.title ?? "milestone"}`,
        description: "Failed on Arc Testnet",
      });
    }
  }

  const merged = new Map<string, ActivityItem>();
  for (const item of items) {
    merged.set(getActivityDedupKey(item), item);
  }

  return Array.from(merged.values()).map((item) => projectActivity(item, role)).sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
