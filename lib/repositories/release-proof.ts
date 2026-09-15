import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { recordActivity } from "@/lib/repositories/activity-log";
import { hasWorkspaceRole } from "@/lib/repositories/permissions";
import { recalculatePayoutStatus } from "@/lib/repositories/payout-status";

export type RefreshProofInput = {
  status: "confirmed" | "failed";
  txHash?: string;
  network?: string;
  explorerUrl?: string;
  blockNumber?: string;
  failureReason?: string;
};

export async function recordReleaseSourceWallet(releaseId: string, workspaceId: string, sourceWalletAddress: string) {
  const existing = await db.release.findFirst({
    where: { id: releaseId, payout: { workspaceId }, status: "pending" },
    select: { sourceWalletAddress: true },
  });
  if (!existing) throw new Error("RELEASE_NOT_FOUND");
  if (existing.sourceWalletAddress) {
    if (existing.sourceWalletAddress.toLowerCase() !== sourceWalletAddress.toLowerCase()) throw new Error("SOURCE_WALLET_MISMATCH");
    return;
  }
  const result = await db.release.updateMany({
    where: { id: releaseId, payout: { workspaceId }, status: "pending", sourceWalletAddress: null },
    data: { sourceWalletAddress },
  });
  if (result.count !== 1) throw new Error("SOURCE_WALLET_MISMATCH");
}

export async function recordReleaseTransactionHash(releaseId: string, workspaceId: string, txHash: string) {
  const result = await db.release.updateMany({
    where: { id: releaseId, payout: { workspaceId }, status: "pending", txHash: null },
    data: { txHash },
  });
  if (result.count !== 1) {
    const current = await db.release.findFirst({ where: { id: releaseId, payout: { workspaceId } }, select: { txHash: true } });
    if (current?.txHash === txHash) return;
    throw new Error("RELEASE_TX_HASH_MISMATCH");
  }
}

export async function claimReleaseExecution(releaseId: string, workspaceId: string) {
  return db.$transaction(async (tx) => {
    const release = await tx.release.findFirst({ where: { id: releaseId, payout: { workspaceId }, status: "queued" }, select: { executionMode: true } });
    const result = await tx.release.updateMany({
      where: { id: releaseId, status: "queued", payout: { workspaceId } },
      data: { status: "pending" },
    });
    if (result.count !== 1) {
      const exists = await tx.release.findFirst({ where: { id: releaseId, payout: { workspaceId } }, select: { id: true } });
      if (!exists) throw new Error("RELEASE_NOT_FOUND");
      throw new Error("RELEASE_ALREADY_CLAIMED");
    }
    return tx.release.findUniqueOrThrow({ where: { id: releaseId }, select: { id: true, status: true, milestoneId: true, payoutId: true } });
  });
}

type ProofRefreshUpdate = {
  status: "confirmed" | "failed";
  txHash: string | null;
  network: string | null;
  explorerUrl: string | null;
  blockNumber: bigint | null | undefined;
  failureReason: string | null;
  confirmedAt: Date | null;
  failedAt: Date | null;
};

type ReleaseRefreshUpdate = {
  status: "confirmed" | "failed";
  executedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
};

export function deriveProofRefreshUpdate(
  input: RefreshProofInput,
  now = new Date(),
): ProofRefreshUpdate {
  return {
    status: input.status,
    txHash: input.status === "confirmed" ? input.txHash ?? null : null,
    network: input.status === "confirmed" ? input.network ?? null : null,
    explorerUrl: input.status === "confirmed" ? input.explorerUrl ?? null : null,
    blockNumber:
      input.status === "confirmed"
        ? (input.blockNumber === undefined ? undefined : BigInt(input.blockNumber))
        : null,
    failureReason: input.status === "failed" ? input.failureReason ?? null : null,
    confirmedAt: input.status === "confirmed" ? now : null,
    failedAt: input.status === "failed" ? now : null,
  };
}

export function deriveReleaseRefreshUpdate(
  input: RefreshProofInput,
  now = new Date(),
): ReleaseRefreshUpdate {
  return {
    status: input.status,
    executedAt: input.status === "confirmed" ? now : null,
    failedAt: input.status === "failed" ? now : null,
    failureReason: input.status === "failed" ? input.failureReason ?? null : null,
  };
}

export async function refreshReleaseProof(
  releaseId: string,
  refreshedByUserId: string,
  workspaceId: string,
  input: RefreshProofInput,
  options: { trustedCircleWalletExecution?: boolean } = {},
) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    let release = await tx.release.findFirst({
      where: { id: releaseId, payout: { workspaceId } },
      select: {
        id: true,
        payoutId: true,
        milestoneId: true,
        status: true,
        amountUsdc: true,
        destinationWalletAddress: true,
        sourceWalletAddress: true,
        txHash: true,
        executionMode: true,
        milestone: { select: { status: true } },
        payout: { select: { workspaceId: true } },
        proofs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            payoutId: true,
            milestoneId: true,
            status: true,
          },
        },
      },
    });
    if (!release) throw new Error("RELEASE_NOT_FOUND");
    if (release.payout.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");

    const canRefresh = await hasWorkspaceRole(
      tx,
      release.payout.workspaceId,
      refreshedByUserId,
      ["owner", "ops"],
    );
    if (!canRefresh) throw new Error("FORBIDDEN_PROOF_REFRESH");

    if (!release.milestoneId) throw new Error("MILESTONE_NOT_FOUND");
    await tx.$queryRaw`SELECT id FROM "Milestone" WHERE id = ${release.milestoneId} AND "payoutId" = ${release.payoutId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Payout" WHERE id = ${release.payoutId} AND "workspaceId" = ${workspaceId} FOR UPDATE`;

    release = await tx.release.findFirst({
      where: { id: releaseId, payout: { workspaceId } },
      select: {
        id: true, payoutId: true, milestoneId: true, status: true,
        amountUsdc: true, destinationWalletAddress: true, sourceWalletAddress: true, txHash: true,
        executionMode: true, milestone: { select: { status: true } },
        payout: { select: { workspaceId: true } },
        proofs: { orderBy: { createdAt: "desc" }, take: 1,
          select: { id: true, payoutId: true, milestoneId: true, status: true } },
      },
    });
    if (!release) throw new Error("RELEASE_NOT_FOUND");
    if (release.payout.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");

    if (release.status !== "pending") {
      throw new Error("RELEASE_NOT_REFRESHABLE");
    }

    const latestForMilestone = release.milestoneId
      ? await tx.release.findFirst({
          where: { milestoneId: release.milestoneId, payout: { workspaceId } },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      : null;
    if (latestForMilestone && latestForMilestone.id !== release.id) {
      throw new Error("STALE_PROOF_REFRESH");
    }

    const proof = release.proofs[0];
    if (!proof) throw new Error("PROOF_NOT_FOUND");
    if (proof.status !== "pending") throw new Error("PROOF_NOT_PENDING");
    if (input.status === "confirmed" && release.milestone?.status !== "approved") {
      throw new Error("MILESTONE_NOT_APPROVED_FOR_CONFIRMATION");
    }
    if (input.status === "confirmed" && !input.txHash) throw new Error("TX_HASH_REQUIRED");
    if (release.executionMode === "circle_wallet" && input.status === "confirmed" && input.txHash !== release.txHash) {
      throw new Error("RELEASE_TX_HASH_MISMATCH");
    }
    if (input.status === "failed" && !input.failureReason) throw new Error("FAILURE_REASON_REQUIRED");
    if (release.executionMode === "circle_wallet" && input.status === "failed" && !options.trustedCircleWalletExecution) {
      throw new Error("CIRCLE_WALLET_FAILURE_REQUIRES_TRUSTED_EXECUTOR");
    }
    let verifiedBrowserSourceWallet: string | null = null;
    if (input.status === "confirmed" && ["browser_wallet", "circle_wallet"].includes(release.executionMode)) {
      if (release.executionMode === "circle_wallet" && !release.sourceWalletAddress) throw new Error("SOURCE_WALLET_REQUIRED");
      const { verifyReleaseTransaction } = await import("@/lib/arc/verify-release-transaction");
      try {
        const verified = await verifyReleaseTransaction({ release, txHash: input.txHash! });
        if (release.executionMode === "browser_wallet") verifiedBrowserSourceWallet = verified.sourceWalletAddress;
      } catch {
        throw new Error("TX_SNAPSHOT_MISMATCH");
      }
    }

    if (verifiedBrowserSourceWallet) {
      const bound = await tx.release.updateMany({
        where: { id: release.id, status: "pending", sourceWalletAddress: null, txHash: null },
        data: { sourceWalletAddress: verifiedBrowserSourceWallet, txHash: input.txHash },
      });
      if (bound.count !== 1) throw new Error("RELEASE_TX_HASH_MISMATCH");
    }

    const now = new Date();
    const updatedProofResult = await tx.transactionProof.updateMany({
      where: { id: proof.id, status: "pending" },
      data: deriveProofRefreshUpdate(input, now),
    });
    if (updatedProofResult.count !== 1) throw new Error("PROOF_NOT_PENDING");
    const updatedProof = await tx.transactionProof.findUniqueOrThrow({
      where: { id: proof.id },
      select: { id: true, status: true, txHash: true, network: true, explorerUrl: true, blockNumber: true, failureReason: true },
    });
    const updatedReleaseResult = await tx.release.updateMany({
      where: { id: release.id, status: "pending" },
      data: deriveReleaseRefreshUpdate(input, now),
    });
    if (updatedReleaseResult.count !== 1) throw new Error("RELEASE_NOT_REFRESHABLE");
    const updatedRelease = await tx.release.findUniqueOrThrow({
      where: { id: release.id },
      select: { id: true, status: true, milestoneId: true, payoutId: true, executedAt: true, failedAt: true, failureReason: true },
    });

    if (input.status === "confirmed") {
      const milestoneId = proof.milestoneId ?? release.milestoneId;
      if (!milestoneId) throw new Error("MILESTONE_NOT_FOUND");

      const milestoneResult = await tx.milestone.updateMany({
        where: { id: milestoneId, status: "approved" },
        data: {
          status: "released",
          releasedAt: now,
        },
      });
      if (milestoneResult.count !== 1) throw new Error("MILESTONE_NOT_APPROVED_FOR_CONFIRMATION");
    }

    await recordActivity(tx, {
      workspaceId: release.payout.workspaceId,
      actorUserId: refreshedByUserId,
      entityType: "proof",
      entityId: proof.id,
      payoutId: release.payoutId,
      milestoneId: release.milestoneId ?? proof.milestoneId ?? undefined,
      releaseId: release.id,
      action: input.status === "confirmed" ? "proof_confirmed" : "proof_failed",
      metadata: {
        txHash: input.status === "confirmed" ? input.txHash : undefined,
        network: input.status === "confirmed" ? input.network : undefined,
        explorerUrl: input.status === "confirmed" ? input.explorerUrl : undefined,
        blockNumber: input.status === "confirmed" ? input.blockNumber : undefined,
        failureReason: input.status === "failed" ? input.failureReason : undefined,
      },
    });

    await recordActivity(tx, {
      workspaceId: release.payout.workspaceId,
      actorUserId: refreshedByUserId,
      entityType: "release",
      entityId: release.id,
      payoutId: release.payoutId,
      milestoneId: release.milestoneId ?? proof.milestoneId ?? undefined,
      releaseId: release.id,
      action: input.status === "confirmed" ? "release_confirmed" : "release_failed",
      metadata: {
        txHash: input.status === "confirmed" ? input.txHash : undefined,
        failureReason: input.status === "failed" ? input.failureReason : undefined,
      },
    });

    const payout = await recalculatePayoutStatus(tx, release.payoutId, workspaceId, true);

    return {
      release: updatedRelease,
      proof: { ...updatedProof, blockNumber: updatedProof.blockNumber?.toString() ?? null },
      payout,
    };
  });
}

/** Preserve an uncertain external submission as non-retryable pending state. */
export async function markReleaseReconciliationPending(
  releaseId: string,
  workspaceId: string,
  input: { txHash?: string; network?: string; explorerUrl?: string; reason: string },
) {
  return db.$transaction(async (tx) => {
    const release = await tx.release.findFirst({
      where: { id: releaseId, payout: { workspaceId } },
      select: { id: true, payout: { select: { workspaceId: true } }, proofs: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } } },
    });
    if (!release) throw new Error("RELEASE_NOT_FOUND");
    if (release.payout.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");
    const proof = release.proofs[0];
    if (!proof) throw new Error("PROOF_NOT_FOUND");
    const current = await tx.release.findUniqueOrThrow({ where: { id: release.id }, select: { status: true } });
    if (current.status !== "pending") throw new Error("RELEASE_NOT_REFRESHABLE");
    const proofState = await tx.transactionProof.findUniqueOrThrow({ where: { id: proof.id }, select: { status: true } });
    if (proofState.status !== "pending") throw new Error("PROOF_NOT_PENDING");
    const updatedRelease = await tx.release.updateMany({
      where: { id: release.id, status: "pending" },
      data: { failureReason: input.reason },
    });
    if (updatedRelease.count !== 1) throw new Error("RELEASE_NOT_REFRESHABLE");

    const updatedProof = await tx.transactionProof.updateMany({
      where: { id: proof.id, status: "pending" },
      data: {
        txHash: input.txHash,
        network: input.network,
        explorerUrl: input.explorerUrl,
        failureReason: input.reason,
      },
    });
    if (updatedProof.count !== 1) throw new Error("PROOF_NOT_PENDING");

    return { releaseId: release.id, proofId: proof.id, status: "pending" as const };
  });
}
