import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { recordActivity } from "@/lib/repositories/activity-log";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";
import { isValidEvmAddress, isValidUsdcAmount } from "@/lib/api/payout-payload";

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
  targetWalletAddress?: string;
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
  if (!isValidUsdcAmount(input.totalAmountUsdc) || (input.targetWalletAddress && !isValidEvmAddress(input.targetWalletAddress)) || input.milestones.some((milestone) => !isValidUsdcAmount(milestone.amountUsdc))) {
    throw new Error("INVALID_PAYOUT_PAYLOAD");
  }
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const creator = await tx.user.findUnique({
      where: { id: input.createdByUserId },
      select: { id: true },
    });
    if (!creator) throw new Error("USER_NOT_FOUND");

    const canCreate = await hasWorkspaceRole(tx, input.workspaceId, input.createdByUserId, ["owner"]);
    if (!canCreate) throw new Error("USER_NOT_ALLOWED_TO_CREATE_PAYOUT");

    const contributor = await tx.contributor.findFirst({
      where: { id: input.contributorId, workspaceId: input.workspaceId, status: "active" },
      select: { id: true, walletAddress: true, linkedUserId: true },
    });
    if (!contributor) throw new Error("CONTRIBUTOR_NOT_FOUND");

    // Existing linked contributors may have created their Circle account
    // before profile synchronization was introduced. Resolve that verified
    // account for this new agreement without changing the profile or any
    // existing payout's recipient snapshot.
    const linkedCircleWallet = !input.targetWalletAddress?.trim() && !contributor.walletAddress && contributor.linkedUserId
      ? await tx.circleUserWallet.findUnique({
          where: { userId: contributor.linkedUserId },
          select: { address: true, blockchain: true, accountType: true },
        })
      : null;
    const recipientAddress = input.targetWalletAddress?.trim()
      || contributor.walletAddress
      || (linkedCircleWallet?.blockchain === "ARC-TESTNET" && linkedCircleWallet.accountType === "SCA"
        ? linkedCircleWallet.address
        : null);

    const payout = await tx.payout.create({
      data: {
        workspaceId: input.workspaceId,
        createdByUserId: input.createdByUserId,
        contributorId: input.contributorId,
        title: input.title,
        description: input.description,
        targetWalletAddress: recipientAddress,
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
