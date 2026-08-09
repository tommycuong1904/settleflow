import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { recordActivity } from "@/lib/repositories/activity-log";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";

export type CreatePayoutMilestoneInput = {
  title: string;
  description: string;
  amountUsdc: string;
  sequence: number;
};

export type CreatePayoutInput = {
  workspaceId: string;
  createdByUserId: string;
  title: string;
  description?: string;
  contributorId: string;
  targetWalletAddress: string;
  totalAmountUsdc: string;
  currency?: string;
  milestones: Array<CreatePayoutMilestoneInput>;
};

export function deriveCreatePayoutMilestonePayloads(
  milestones: Array<CreatePayoutMilestoneInput>,
) {
  return milestones.map((milestone) => ({
    title: milestone.title,
    description: milestone.description,
    amountUsdc: milestone.amountUsdc,
    sequence: milestone.sequence,
  }));
}

export async function createPayout(input: CreatePayoutInput) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const creator = await tx.user.findUnique({
      where: { id: input.createdByUserId },
      select: { id: true },
    });
    if (!creator) throw new Error("USER_NOT_FOUND");

    const canCreate = await hasWorkspaceRole(tx, input.workspaceId, input.createdByUserId, ["owner", "ops"]);
    if (!canCreate) throw new Error("USER_NOT_ALLOWED_TO_CREATE_PAYOUT");

    const contributor = await tx.contributor.findFirst({
      where: { id: input.contributorId, workspaceId: input.workspaceId, status: "active" },
      select: { id: true },
    });
    if (!contributor) throw new Error("CONTRIBUTOR_NOT_FOUND");

    const payout = await tx.payout.create({
      data: {
        workspaceId: input.workspaceId,
        createdByUserId: input.createdByUserId,
        contributorId: input.contributorId,
        title: input.title,
        description: input.description,
        targetWalletAddress: input.targetWalletAddress,
        totalAmountUsdc: input.totalAmountUsdc,
        currency: "USDC",
        status: "draft",
        milestones: {
          create: deriveCreatePayoutMilestonePayloads(input.milestones),
        },
      },
      select: { id: true, status: true },
    });
    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.createdByUserId,
      entityType: "payout",
      entityId: payout.id,
      payoutId: payout.id,
      action: "payout_created",
      metadata: {
        contributorId: input.contributorId,
        milestoneCount: input.milestones.length,
      },
    });
    return payout;
  });
}
