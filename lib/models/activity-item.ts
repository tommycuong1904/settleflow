export type ActivityItem = {
  id: string;
  entityType: "payout" | "milestone" | "release" | "proof" | "system";
  entityId: string;
  payoutId?: string;
  milestoneId?: string;
  action: string;
  occurredAt: string;
  actorLabel: string;
  title: string;
  description?: string;
  metadata?: Record<string, string | undefined>;
};

export type AccessibleActivityItem = ActivityItem & {
  workspaceId: string;
  workspaceName: string;
  membershipRole: "owner" | "reviewer" | "contributor" | "ops";
};
