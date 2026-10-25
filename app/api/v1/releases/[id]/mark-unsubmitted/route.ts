import { NextResponse } from "next/server";
import {
  findReleaseTransactionCandidates,
  isBrowserReconciliationReadyToClose,
} from "@/lib/arc/find-release-transaction";
import {
  getBrowserReleaseReconciliationSnapshot,
  refreshReleaseProof,
} from "@/lib/repositories/release-proof";
import { resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { assertCanRefreshProof } from "@/lib/runtime/product-policy";

const FAILURE_REASON = "BROWSER_WALLET_RECONCILIATION: No matching confirmed Arc USDC transfer was found after owner-confirmed reconciliation.";

/**
 * Closes only an old, uncertain browser-wallet attempt after one final server
 * reconciliation. The client cannot mark an attempt failed by itself.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await resolveProductContextFromRequestWithSession(request);
  const violation = assertCanRefreshProof({ productContext: context, actorUserId: context.ownerUserId });
  if (violation) return NextResponse.json({ error: violation.message }, { status: violation.status });

  try {
    const release = await getBrowserReleaseReconciliationSnapshot(id, context.workspaceId);
    if (!isBrowserReconciliationReadyToClose(release)) {
      return NextResponse.json({ error: "RECONCILIATION_WINDOW_OPEN" }, { status: 409 });
    }
    const candidates = await findReleaseTransactionCandidates(release);
    if (candidates.length > 0) {
      return NextResponse.json({ error: "MATCHING_TRANSACTION_FOUND", candidates }, { status: 409 });
    }
    const result = await refreshReleaseProof(id, context.ownerUserId, context.workspaceId, {
      status: "failed",
      failureReason: FAILURE_REASON,
    });
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNABLE_TO_CLOSE_RECONCILIATION";
    const status = ["RELEASE_NOT_FOUND"].includes(code) ? 404 : ["RELEASE_NOT_RECONCILABLE", "RELEASE_NOT_REFRESHABLE", "STALE_PROOF_REFRESH", "PROOF_NOT_PENDING"].includes(code) ? 409 : 502;
    return NextResponse.json({ error: code }, { status });
  }
}
