import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";

export type CreatePayoutInput = {
  workspaceId: string;
  createdByUserId: string;
  title: string;
  description?: string;
  contributorId: string;
  targetWalletAddress: string;
  totalAmountUsdc: string;
  currency?: string;
  milestones: Array<{
    title: string;
    description: string;
    amountUsdc: string;
    sequence: number;
  }>;
};

export async function createPayout(input: CreatePayoutInput) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
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
          create: input.milestones.map((milestone) => ({
            title: milestone.title,
            description: milestone.description,
            amountUsdc: milestone.amountUsdc,
            sequence: milestone.sequence,
          })),
        },
      },
      select: { id: true, status: true },
    });
    return payout;
  });
}
