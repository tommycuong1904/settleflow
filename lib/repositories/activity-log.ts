import type { Prisma } from "@prisma/client";

type RecordActivityInput = {
  workspaceId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  payoutId?: string;
  milestoneId?: string;
  releaseId?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function recordActivity(
  tx: Prisma.TransactionClient,
  input: RecordActivityInput,
) {
  await tx.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      payoutId: input.payoutId,
      milestoneId: input.milestoneId,
      releaseId: input.releaseId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      metadataJson: input.metadata,
    },
  });
}
