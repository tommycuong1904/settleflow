import { findReleaseTransactionCandidates } from "@/lib/arc/find-release-transaction";
import { db } from "@/lib/db/client";
import { claimReleaseExecution, refreshReleaseProof } from "@/lib/repositories/release-proof";

const MAX_RELEASES_PER_RUN = 20;

type Candidate = {
  txHash: string;
  blockNumber: string;
  explorerUrl: string;
};

type Dependencies = {
  findCandidates?: typeof findReleaseTransactionCandidates;
  claim?: typeof claimReleaseExecution;
  refresh?: typeof refreshReleaseProof;
};

export type ReleaseReconciliationSummary = {
  scanned: number;
  matched: number;
  pending: number;
  ambiguous: number;
  errors: number;
};

/**
 * Reconciles only browser releases with an independently verifiable onchain
 * transfer. Missing or ambiguous evidence intentionally remains pending: this
 * job never retries, sends funds, or infers a failure.
 */
export async function reconcilePendingBrowserReleases(
  dependencies: Dependencies = {},
): Promise<ReleaseReconciliationSummary> {
  const findCandidates = dependencies.findCandidates ?? findReleaseTransactionCandidates;
  const claim = dependencies.claim ?? claimReleaseExecution;
  const refresh = dependencies.refresh ?? refreshReleaseProof;
  const cutoff = new Date(Date.now() - 60_000);
  const releases = await db.release.findMany({
    where: {
      executionMode: "browser_wallet",
      status: { in: ["queued", "pending"] },
      sourceWalletAddress: { not: null },
      requestedAt: { lte: cutoff },
      proofs: { some: { status: "pending" } },
    },
    orderBy: { requestedAt: "asc" },
    take: MAX_RELEASES_PER_RUN,
    select: {
      id: true,
      status: true,
      amountUsdc: true,
      destinationWalletAddress: true,
      sourceWalletAddress: true,
      requestedAt: true,
      triggeredByUserId: true,
      payout: { select: { workspaceId: true } },
    },
  });

  const summary: ReleaseReconciliationSummary = {
    scanned: releases.length,
    matched: 0,
    pending: 0,
    ambiguous: 0,
    errors: 0,
  };

  for (const release of releases) {
    if (!release.sourceWalletAddress) continue;
    try {
      const candidates = await findCandidates({
        amountUsdc: release.amountUsdc.toString(),
        destinationWalletAddress: release.destinationWalletAddress,
        sourceWalletAddress: release.sourceWalletAddress,
        requestedAt: release.requestedAt,
        executionMode: "browser_wallet",
      });
      if (candidates.length === 0) {
        summary.pending += 1;
        continue;
      }
      if (candidates.length !== 1) {
        summary.ambiguous += 1;
        continue;
      }

      const candidate: Candidate = candidates[0];
      if (release.status === "queued") await claim(release.id, release.payout.workspaceId);
      await refresh(release.id, release.triggeredByUserId, release.payout.workspaceId, {
        status: "confirmed",
        txHash: candidate.txHash,
        network: "Arc Testnet",
        explorerUrl: candidate.explorerUrl,
        blockNumber: candidate.blockNumber,
      });
      summary.matched += 1;
    } catch {
      // Preserve the release. Vercel's response count provides an observable
      // signal without exposing wallet or provider diagnostics in the client.
      summary.errors += 1;
    }
  }

  return summary;
}
