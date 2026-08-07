import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";

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

export async function updatePayoutDraft(
  id: string,
  workspaceId: string,
  input: UpdatePayoutDraftInput,
) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const current = await tx.payout.findFirst({
      where: { id, workspaceId },
      select: { status: true, contributorId: true },
    });
    if (!current) throw new Error("PAYOUT_NOT_FOUND");
    if (current.status !== "draft") throw new Error("PAYOUT_NOT_DRAFT");

    if (input.contributorId) {
      const contributor = await tx.contributor.findFirst({
        where: { id: input.contributorId, workspaceId, status: "active" },
        select: { id: true },
      });
      if (!contributor) throw new Error("CONTRIBUTOR_NOT_FOUND");
    }

    return tx.payout.update({
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
  });
}
