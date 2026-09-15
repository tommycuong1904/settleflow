import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { recordActivity } from "@/lib/repositories/activity-log";
import { isValidEvmAddress, isValidUsdcAmount } from "@/lib/api/payout-payload";

export type UpdatePayoutDraftInput = {
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

export function deriveDraftUpdateActivityMetadata(
  input: UpdatePayoutDraftInput,
  currentContributorId: string,
) {
  const changedFields = Object.keys(input);
  const headerChangedFields = changedFields.filter((key) => key !== "milestones");

  return {
    changedFields,
    headerChangedFields,
    headerChanged: String(headerChangedFields.length > 0),
    milestonesChanged: String(input.milestones !== undefined),
    contributorChanged:
      input.contributorId !== undefined
        ? String(input.contributorId !== currentContributorId)
        : undefined,
    milestoneCount: input.milestones?.length,
  };
}

export async function updatePayoutDraft(
  id: string,
  workspaceId: string,
  input: UpdatePayoutDraftInput,
  actorUserId: string,
) {
  if ((input.targetWalletAddress !== undefined && !isValidEvmAddress(input.targetWalletAddress)) ||
      (input.totalAmountUsdc !== undefined && !isValidUsdcAmount(input.totalAmountUsdc)) ||
      (input.milestones !== undefined && input.milestones.some((milestone) => !isValidUsdcAmount(milestone.amountUsdc)))) {
    throw new Error("INVALID_PAYOUT_UPDATE_PAYLOAD");
  }
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const current = await tx.payout.findFirst({
      where: { id, workspaceId },
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

    const draftUpdate = await tx.payout.updateMany({
      where: { id, workspaceId, status: "draft" },
      data: { updatedAt: new Date() },
    });
    if (draftUpdate.count !== 1) throw new Error("PAYOUT_NOT_DRAFT");

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
      select: {
        id: true,
        status: true,
        title: true,
        description: true,
        totalAmountUsdc: true,
        milestones: {
          orderBy: { sequence: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            amountUsdc: true,
            sequence: true,
          },
        },
      },
    });

    {
      await recordActivity(tx, {
        workspaceId,
        actorUserId,
        entityType: "payout",
        entityId: id,
        payoutId: id,
        action: "payout_draft_updated",
        metadata: deriveDraftUpdateActivityMetadata(input, current.contributorId),
      });
    }

    return {
      id: updated.id,
      status: updated.status,
      title: updated.title,
      description: updated.description,
      totalAmountUsdc: updated.totalAmountUsdc.toString(),
      milestoneCount: updated.milestones.length,
      milestones: updated.milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        amountUsdc: milestone.amountUsdc.toString(),
        sequence: milestone.sequence,
      })),
    };
  });
}
