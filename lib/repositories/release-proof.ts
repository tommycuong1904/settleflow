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
) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const release = await tx.release.findUnique({
      where: { id: releaseId },
      select: {
        id: true,
        payoutId: true,
        milestoneId: true,
        status: true,
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

    if (release.status === "confirmed" || release.status === "cancelled") {
      throw new Error("RELEASE_NOT_REFRESHABLE");
    }

    const latestForMilestone = release.milestoneId
      ? await tx.release.findFirst({
          where: { milestoneId: release.milestoneId },
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
    if (input.status === "failed" && !input.failureReason) throw new Error("FAILURE_REASON_REQUIRED");

    const now = new Date();
    const updatedProof = await tx.transactionProof.update({
      where: { id: proof.id },
      data: deriveProofRefreshUpdate(input, now),
      select: { id: true, status: true, txHash: true, network: true, explorerUrl: true, blockNumber: true, failureReason: true },
    });
    const updatedRelease = await tx.release.update({
      where: { id: release.id },
      data: deriveReleaseRefreshUpdate(input, now),
      select: { id: true, status: true, milestoneId: true, payoutId: true, executedAt: true, failedAt: true, failureReason: true },
    });

    if (input.status === "confirmed") {
      const milestoneId = proof.milestoneId ?? release.milestoneId;
      if (!milestoneId) throw new Error("MILESTONE_NOT_FOUND");

      await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: "released",
          releasedAt: now,
        },
      });
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

    const payout = await recalculatePayoutStatus(tx, release.payoutId);

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
    const release = await tx.release.findUnique({
      where: { id: releaseId },
      select: { id: true, payout: { select: { workspaceId: true } }, proofs: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } } },
    });
    if (!release) throw new Error("RELEASE_NOT_FOUND");
    if (release.payout.workspaceId !== workspaceId) throw new Error("WORKSPACE_SCOPE_MISMATCH");
    const proof = release.proofs[0];
    if (!proof) throw new Error("PROOF_NOT_FOUND");
    await tx.release.update({ where: { id: release.id }, data: { status: "pending", failureReason: input.reason } });
    await tx.transactionProof.update({ where: { id: proof.id }, data: { status: "pending", txHash: input.txHash, network: input.network, explorerUrl: input.explorerUrl, failureReason: input.reason } });
    return { releaseId: release.id, proofId: proof.id, status: "pending" as const };
  });
}
