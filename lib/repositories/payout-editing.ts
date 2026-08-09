import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { recordActivity } from "@/lib/repositories/activity-log";

export type UpdatePayoutDraftInput = {
  updatedByUserId?: string;
  actorUserId?: string;
  ownerUserId?: string;
  title?: string;
  description?: string;
  contributorId?: string;
  targetWalletAddress?: string;
  totalAmountUsdc?: string;
  milestones?: Array<{
    title: string;
    description: string;
    amountUsdc: string;
    sequence: number;
  }>;
};

export async function updatePayoutDraft(
  id: string,
  workspaceId: string,
  input: UpdatePayoutDraftInput,
) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const current = await tx.payout.findUnique({
      where: { id },
      select: { status: true, contributorId: true, workspaceId: true },
    });
    if (!current) throw new Error("PAYOUT_NOT_FOUND");
    if (current.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");
    if (current.status !== "draft") throw new Error("PAYOUT_NOT_DRAFT");

    if (input.contributorId) {
      const contributor = await tx.contributor.findFirst({
        where: { id: input.contributorId, workspaceId, status: "active" },
        select: { id: true },
      });
      if (!contributor) throw new Error("CONTRIBUTOR_NOT_FOUND");
    }

    const updated = await tx.payout.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        contributorId: input.contributorId,
        targetWalletAddress: input.targetWalletAddress,
        totalAmountUsdc: input.totalAmountUsdc,
        ...(input.milestones
          ? {
              milestones: {
                deleteMany: {},
                create: input.milestones,
              },
            }
          : {}),
      },
      select: { id: true, status: true },
    });

    const actorUserId = input.updatedByUserId ?? input.actorUserId ?? input.ownerUserId;
    if (actorUserId) {
      await recordActivity(tx, {
        workspaceId,
        actorUserId,
        entityType: "payout",
        entityId: id,
        payoutId: id,
        action: "payout_draft_updated",
        metadata: {
          changedFields: Object.keys(input).filter(
            (key) => key !== "updatedByUserId" && key !== "actorUserId" && key !== "ownerUserId",
          ),
          contributorChanged: input.contributorId !== undefined ? String(input.contributorId !== current.contributorId) : undefined,
          milestoneCount: input.milestones?.length,
        },
      });
    }

    return updated;
  });
}
