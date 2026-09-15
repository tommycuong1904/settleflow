import { Decimal } from "@prisma/client/runtime/library";
import { db } from "@/lib/db/client";

type ReleaseProofRecord = {
  id: string;
  status: string;
  txHash: string | null;
  network: string | null;
  explorerUrl: string | null;
  blockNumber: bigint | null;
  failureReason: string | null;
  confirmedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ReleaseRecord = {
  id: string;
  payoutId: string;
  payout: { workspaceId: string };
  milestoneId: string | null;
  triggeredByUserId: string;
  amountUsdc: Decimal;
  status: string;
  arcRequestId: string | null;
  destinationWalletAddress: string;
  failureReason: string | null;
  requestedAt: Date | null;
  executedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  proofs: ReleaseProofRecord[];
};
export function normalizeReleaseProof(proof: ReleaseProofRecord) {
  return {
    ...proof,
    blockNumber: proof.blockNumber?.toString() ?? null,
  };
}

export function normalizeReleaseRecord(release: ReleaseRecord) {
  const { payout: _payout, ...releaseData } = release;
  return {
    ...releaseData,
    amountUsdc: release.amountUsdc.toString(),
    proofs: release.proofs.map(normalizeReleaseProof),
  };
}

export type ReleaseViewRole = "owner" | "reviewer" | "contributor" | "ops";

type RestrictedReleaseDetail = {
  id: string;
  payoutId: string;
  milestoneId: string | null;
  status: string;
  requestedAt: string | null;
  executedAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectedReleaseDetail = ReturnType<typeof normalizeReleaseRecord> | RestrictedReleaseDetail;

export function projectReleaseDetail(release: ReleaseRecord, role: ReleaseViewRole): ProjectedReleaseDetail {
  if (role === "reviewer" || role === "ops") {
    return {
      id: release.id,
      payoutId: release.payoutId,
      milestoneId: release.milestoneId,
      status: release.status,
      requestedAt: release.requestedAt?.toISOString() ?? null,
      executedAt: release.executedAt?.toISOString() ?? null,
      failedAt: release.failedAt?.toISOString() ?? null,
      createdAt: release.createdAt.toISOString(),
      updatedAt: release.updatedAt.toISOString(),
    };
  }
  return normalizeReleaseRecord(release);
}

export async function getReleaseById(
  id: string,
  workspaceId: string,
  linkedUserId: string | undefined,
  role: ReleaseViewRole,
): Promise<ProjectedReleaseDetail | null> {
  const release = await db.release.findFirst({
    where: {
      id,
      payout: { workspaceId, ...(linkedUserId ? { contributor: { linkedUserId } } : {}) },
    },
    select: {
      id: true,
      payoutId: true,
      payout: { select: { workspaceId: true } },
      milestoneId: true,
      triggeredByUserId: true,
      amountUsdc: true,
      status: true,
      arcRequestId: true,
      destinationWalletAddress: true,
      failureReason: true,
      requestedAt: true,
      executedAt: true,
      failedAt: true,
      createdAt: true,
      updatedAt: true,
      proofs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          txHash: true,
          network: true,
          explorerUrl: true,
          blockNumber: true,
          failureReason: true,
          confirmedAt: true,
          failedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!release) return null;
  if (workspaceId && release.payout.workspaceId !== workspaceId) return null;
  return projectReleaseDetail(release, role);
}
