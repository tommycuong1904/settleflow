export type ActivityItem = {
  id: string;
  entityType: "payout" | "milestone" | "release" | "proof" | "system";
  entityId: string;
  action: string;
  occurredAt: string;
  actorLabel: string;
  title: string;
  description?: string;
  metadata?: Record<string, string | undefined>;
};
