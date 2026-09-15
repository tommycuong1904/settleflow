import { db } from "@/lib/db/client";

export type PayoutListItem = {
  id: string;
  title: string;
  contributorId: string;
  totalAmount: string;
  currency: "USDC";
  status: "draft" | "active" | "partially_released" | "completed";
  createdAt: string;
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
    createdAt: payout.createdAt.toISOString(),
  };
}

export async function listPayouts(input: {
  workspaceId: string;
  contributorId?: string;
  linkedUserId?: string;
  createdByUserId?: string;
  status?: PayoutListItem["status"];
}): Promise<PayoutListItem[]> {
  const payouts = await db.payout.findMany({
    where: {
      workspaceId: input.workspaceId,
      ...(input?.contributorId ? { contributorId: input.contributorId } : {}),
      ...(input?.linkedUserId
        ? { contributor: { linkedUserId: input.linkedUserId } }
        : {}),
      ...(input?.createdByUserId ? { createdByUserId: input.createdByUserId } : {}),
      ...(input?.status ? { status: input.status } : {}),
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
  workspaceId: string,
  scope?: { linkedUserId?: string; createdByUserId?: string },
): Promise<PayoutListItem | null> {
  const payout = await db.payout.findFirst({
    where: {
      id,
      workspaceId,
      ...(scope?.linkedUserId ? { contributor: { linkedUserId: scope.linkedUserId } } : {}),
      ...(scope?.createdByUserId ? { createdByUserId: scope.createdByUserId } : {}),
    },
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

export type PayoutViewRole = "owner" | "reviewer" | "contributor" | "ops";

type ReviewerPayoutDetail = {
  payout: Pick<PayoutDetailData["payout"], "id" | "title" | "contributorId" | "status" | "createdAt">;
  milestones: Array<Pick<PayoutDetailData["milestones"][number], "id" | "payoutId" | "title" | "description" | "amount" | "status" | "submittedAt" | "approvedAt" | "releasedAt">>;
};

type OpsPayoutDetail = {
  payout: Pick<PayoutDetailData["payout"], "id" | "title" | "status" | "createdAt">;
  milestones: Array<Pick<PayoutDetailData["milestones"][number], "id" | "payoutId" | "title" | "status" | "submittedAt" | "approvedAt" | "releasedAt">>;
};

export type ProjectedPayoutDetail =
  | PayoutDetailData
  | ReviewerPayoutDetail
  | OpsPayoutDetail;

export function projectPayoutDetail(detail: PayoutDetailData, role: PayoutViewRole): ProjectedPayoutDetail {
  if (role === "owner" || role === "contributor") return detail;
  if (role === "reviewer") {
    return {
      payout: {
        id: detail.payout.id,
        title: detail.payout.title,
        status: detail.payout.status,
        createdAt: detail.payout.createdAt,
      },
      milestones: detail.milestones.map(({ id, payoutId, title, description, amount, status, submittedAt, approvedAt, releasedAt }) => ({
        id, payoutId, title, description, amount, status, submittedAt, approvedAt, releasedAt,
      })),
    };
  }
  return {
    payout: { id: detail.payout.id, title: detail.payout.title, status: detail.payout.status, createdAt: detail.payout.createdAt },
    milestones: detail.milestones.map(({ id, payoutId, title, status, submittedAt, approvedAt, releasedAt }) => ({
      id, payoutId, title, status, submittedAt, approvedAt, releasedAt,
    })),
  };
}

// ---------- Full payout detail read model ----------

export type PayoutDetailData = {
  payout: {
    id: string;
    title: string;
    description?: string;
    contributorId: string;
    createdByUserId?: string;
    targetWalletAddress?: string;
    creatorWalletAddress?: string;
    creatorEmail?: string;
    totalAmount: number;
    currency: "USDC";
    status: "draft" | "active" | "partially_released" | "completed";
    createdAt: string;
  };
  contributor?: {
    id: string;
    name: string;
    walletAddress: string;
    linkedUserId?: string | null;
    role?: string;
  };
  milestones: {
    id: string;
    payoutId: string;
    title: string;
    description: string;
    amount: number;
    status: "pending" | "submitted" | "approved" | "released" | "rejected";
    submittedAt?: string;
    approvedAt?: string;
    releasedAt?: string;
  }[];
  releaseProof?: {
    id: string;
    releaseId?: string;
    milestoneId: string;
    txHash: string;
    network: string;
    status: "pending" | "confirmed" | "failed";
    explorerUrl: string;
    blockNumber?: string;
    failureReason?: string;
    confirmedAt?: string;
    failedAt?: string;
  };
};

/**
 * Fetch payout detail with milestones, contributor, and latest proof.
 * Returns null if payout not found.
 */
export async function getPayoutDetail(
  id: string,
  workspaceId: string,
  scope?: { linkedUserId?: string; createdByUserId?: string },
): Promise<PayoutDetailData | null> {
  const payout = await db.payout.findFirst({
    where: {
      id,
      workspaceId,
      ...(scope?.linkedUserId ? { contributor: { linkedUserId: scope.linkedUserId } } : {}),
      ...(scope?.createdByUserId ? { createdByUserId: scope.createdByUserId } : {}),
    },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      description: true,
      contributorId: true,
      createdByUserId: true,
      targetWalletAddress: true,
      totalAmountUsdc: true,
      currency: true,
      status: true,
      createdAt: true,
      createdBy: {
        select: { walletAddress: true, email: true },
      },
      contributor: {
        select: { id: true, name: true, walletAddress: true, linkedUserId: true, role: true },
      },
      milestones: {
        orderBy: { sequence: "asc" },
        select: {
          id: true,
          payoutId: true,
          title: true,
          description: true,
          amountUsdc: true,
          status: true,
          submittedAt: true,
          approvedAt: true,
          rejectedAt: true,
          releasedAt: true,
        },
      },
      transactionProofs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          releaseId: true,
          milestoneId: true,
          txHash: true,
          network: true,
          status: true,
          explorerUrl: true,
          blockNumber: true,
          failureReason: true,
          confirmedAt: true,
          failedAt: true,
        },
      },
    },
  });

  if (!payout) return null;

  const detail: PayoutDetailData = {
    payout: {
      id: payout.id,
      title: payout.title,
      description: payout.description ?? undefined,
      contributorId: payout.contributorId,
      createdByUserId: payout.createdByUserId,
      targetWalletAddress: payout.targetWalletAddress ?? undefined,
      creatorWalletAddress: payout.createdBy?.walletAddress ?? undefined,
      creatorEmail: payout.createdBy?.email ?? undefined,
      totalAmount: Number(payout.totalAmountUsdc.toString()),
      currency: "USDC",
      status: payout.status,
      createdAt: payout.createdAt.toISOString(),
    },
    contributor: payout.contributor
      ? {
          id: payout.contributor.id,
          name: payout.contributor.name,
          walletAddress: payout.contributor.walletAddress,
          linkedUserId: payout.contributor.linkedUserId ?? null,
          role: payout.contributor.role ?? undefined,
        }
      : undefined,
    milestones: payout.milestones.map((m) => ({
      id: m.id,
      payoutId: m.payoutId,
      title: m.title,
      description: m.description,
      amount: Number(m.amountUsdc.toString()),
      status: m.status,
      submittedAt: m.submittedAt?.toISOString() ?? undefined,
      approvedAt: m.approvedAt?.toISOString() ?? undefined,
      rejectedAt: m.rejectedAt?.toISOString() ?? undefined,
      releasedAt: m.releasedAt?.toISOString() ?? undefined,
    })),
    releaseProof: payout.transactionProofs[0]
      ? {
          id: payout.transactionProofs[0].id,
          releaseId: payout.transactionProofs[0].releaseId ?? undefined,
          milestoneId: payout.transactionProofs[0].milestoneId ?? "",
          txHash: payout.transactionProofs[0].txHash ?? "",
          network: payout.transactionProofs[0].network ?? "Arc Testnet",
          status: payout.transactionProofs[0].status,
          explorerUrl: payout.transactionProofs[0].explorerUrl ?? "",
          blockNumber: payout.transactionProofs[0].blockNumber?.toString() ?? undefined,
          failureReason: payout.transactionProofs[0].failureReason ?? undefined,
          confirmedAt:
            payout.transactionProofs[0].confirmedAt?.toISOString() ?? undefined,
          failedAt:
            payout.transactionProofs[0].failedAt?.toISOString() ?? undefined,
        }
      : undefined,
  };

  return detail;
}
