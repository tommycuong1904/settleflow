import { db } from "@/lib/db/client";

export type PayoutListItem = {
  id: string;
  title: string;
  contributorId: string;
  totalAmount: string;
  currency: "USDC";
  status: "draft" | "active" | "partially_released" | "completed";
  createdAt: Date;
};

type PayoutRecord = {
  id: string;
  title: string;
  contributorId: string;
  totalAmountUsdc: { toString(): string };
  currency: string;
  status: PayoutListItem["status"];
  createdAt: Date;
};

function toListItem(payout: PayoutRecord): PayoutListItem {
  if (payout.currency !== "USDC") {
    throw new Error("UNSUPPORTED_CURRENCY");
  }

  return {
    id: payout.id,
    title: payout.title,
    contributorId: payout.contributorId,
    totalAmount: payout.totalAmountUsdc.toString(),
    currency: "USDC",
    status: payout.status,
    createdAt: payout.createdAt,
  };
}

export async function listPayouts(input?: {
  workspaceId?: string;
  contributorId?: string;
  status?: PayoutListItem["status"];
}): Promise<PayoutListItem[]> {
  const payouts = await db.payout.findMany({
    where: {
      workspaceId: input?.workspaceId,
      contributorId: input?.contributorId,
      status: input?.status,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      contributorId: true,
      totalAmountUsdc: true,
      currency: true,
      status: true,
      createdAt: true,
    },
  });

  return payouts.map(toListItem);
}

export async function getPayoutById(
  id: string,
  workspaceId?: string,
): Promise<PayoutListItem | null> {
  const payout = await db.payout.findFirst({
    where: { id, workspaceId },
    select: {
      id: true,
      title: true,
      contributorId: true,
      totalAmountUsdc: true,
      currency: true,
      status: true,
      createdAt: true,
    },
  });

  return payout ? toListItem(payout) : null;
}
