import { db } from "@/lib/db/client";

export async function getDashboardSummary(workspaceId: string, linkedUserId?: string, role: "owner" | "contributor" = "owner") {
  if (!workspaceId.trim()) throw new Error("AUTH_CONTEXT_REQUIRED");
  if (role !== "owner" && !linkedUserId) throw new Error("FORBIDDEN_DASHBOARD_SUMMARY");
  const payoutWhere = { workspaceId, ...(linkedUserId ? { contributor: { linkedUserId } } : {}) };
  const [activePayouts, pendingReviewMilestones, confirmedSettlements, outstanding] =
    await Promise.all([
      db.payout.count({ where: { ...payoutWhere, status: "active" } }),
      db.milestone.count({ where: { payout: payoutWhere, status: "submitted" } }),
      db.transactionProof.count({ where: { payout: payoutWhere, status: "confirmed" } }),
      db.payout.aggregate({
        where: { ...payoutWhere, status: { in: ["active", "partially_released"] } },
        _sum: { totalAmountUsdc: true },
      }),
    ]);

  return {
    stats: {
      activePayouts,
      pendingReviewMilestones,
      confirmedSettlements,
      totalOutstandingUsdc: outstanding._sum.totalAmountUsdc?.toString() ?? "0",
    },
  };
}

// ---------- Rich read model for dashboard page ----------

type DashboardPayout = {
  id: string;
  title: string;
  contributorId: string;
  totalAmount: number;
  currency: "USDC";
  status: "draft" | "active" | "partially_released" | "completed";
  createdAt: string;
};

type DashboardMilestone = {
  id: string;
  payoutId: string;
  title: string;
  description: string;
  amount: number;
  status: "pending" | "submitted" | "approved" | "released" | "rejected";
  submittedAt?: string;
  approvedAt?: string;
  releasedAt?: string;
};

type DashboardContributor = {
  id: string;
  name: string;
  walletAddress: string;
  role?: string;
};

type DashboardTransactionProof = {
  id: string;
  milestoneId: string;
  txHash: string;
  network: string;
  status: "pending" | "confirmed" | "failed";
  explorerUrl: string;
  confirmedAt?: string;
};

export type DashboardData = {
  payouts: DashboardPayout[];
  milestones: DashboardMilestone[];
  contributors: DashboardContributor[];
  transactionProofs: DashboardTransactionProof[];
};

function mapPayout(row: {
  id: string;
  title: string;
  contributorId: string;
  totalAmountUsdc: { toString(): string };
  currency: string;
  status: string;
  createdAt: Date;
}): DashboardPayout {
  return {
    id: row.id,
    title: row.title,
    contributorId: row.contributorId,
    totalAmount: Number(row.totalAmountUsdc.toString()),
    currency: "USDC",
    status: row.status as DashboardPayout["status"],
    createdAt: row.createdAt.toISOString(),
  };
}

function mapMilestone(row: {
  id: string;
  payoutId: string;
  title: string;
  description: string;
  amountUsdc: { toString(): string };
  status: string;
  submittedAt: Date | null;
  approvedAt: Date | null;
  releasedAt: Date | null;
}): DashboardMilestone {
  return {
    id: row.id,
    payoutId: row.payoutId,
    title: row.title,
    description: row.description,
    amount: Number(row.amountUsdc.toString()),
    status: row.status as DashboardMilestone["status"],
    submittedAt: row.submittedAt?.toISOString() ?? undefined,
    approvedAt: row.approvedAt?.toISOString() ?? undefined,
    releasedAt: row.releasedAt?.toISOString() ?? undefined,
  };
}

function mapContributor(row: {
  id: string;
  name: string;
  walletAddress: string;
  role: string | null;
}): DashboardContributor {
  return {
    id: row.id,
    name: row.name,
    walletAddress: row.walletAddress,
    role: row.role ?? undefined,
  };
}

function mapProof(row: {
  id: string;
  milestoneId: string | null;
  txHash: string | null;
  network: string | null;
  status: string;
  explorerUrl: string | null;
  confirmedAt: Date | null;
}): DashboardTransactionProof {
  return {
    id: row.id,
    milestoneId: row.milestoneId ?? "",
    txHash: row.txHash ?? "",
    network: row.network ?? "Arc Testnet",
    status: row.status as DashboardTransactionProof["status"],
    explorerUrl: row.explorerUrl ?? "",
    confirmedAt: row.confirmedAt?.toISOString() ?? undefined,
  };
}

/**
 * Full dashboard read model.
 * Returns all payouts, milestones, contributors, and proofs for a workspace
 * so the dashboard page can render without any mock data.
 *
 * If workspaceId is provided, filters to that workspace only.
 * Otherwise returns all available data for the current unscoped runtime.
 */
export async function getDashboardData(input: {
  workspaceId: string;
  role?: "owner" | "ops" | "reviewer" | "contributor";
  userId?: string;
}): Promise<DashboardData> {
  if (input.role === "reviewer" || input.role === "ops") throw new Error("FORBIDDEN_DASHBOARD_SUMMARY");
  const contributorScope = input.role === "contributor" && input.userId
    ? { contributor: { linkedUserId: input.userId } }
    : {};
  const payoutWhere = { workspaceId: input.workspaceId, ...contributorScope };

  const [payoutRows, milestoneRows, contributorRows, proofRows] =
    await Promise.all([
      db.payout.findMany({
        where: payoutWhere,
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
      }),
      db.milestone.findMany({
        where: { payout: payoutWhere },
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
          releasedAt: true,
        },
      }),
      db.contributor.findMany({
        where: { workspaceId: input.workspaceId, ...(input.role === "contributor" && input.userId ? { linkedUserId: input.userId } : {}) },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          walletAddress: true,
          role: true,
        },
      }),
      db.transactionProof.findMany({
        where: { payout: payoutWhere },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          milestoneId: true,
          txHash: true,
          network: true,
          status: true,
          explorerUrl: true,
          confirmedAt: true,
        },
      }),
    ]);

  return {
    payouts: payoutRows.map(mapPayout),
    milestones: milestoneRows.map(mapMilestone),
    contributors: contributorRows.map(mapContributor),
    transactionProofs: proofRows.map(mapProof),
  };
}
