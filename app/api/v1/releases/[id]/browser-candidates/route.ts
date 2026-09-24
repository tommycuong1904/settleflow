import { NextResponse } from "next/server";
import { resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { findReleaseTransactionCandidates } from "@/lib/arc/find-release-transaction";
import { getBrowserReleaseReconciliationSnapshot } from "@/lib/repositories/release-proof";
import { assertCanRefreshProof } from "@/lib/runtime/product-policy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await resolveProductContextFromRequestWithSession(request);
  const violation = assertCanRefreshProof({ productContext: context, actorUserId: context.ownerUserId });
  if (violation) return NextResponse.json({ error: violation.message }, { status: violation.status });

  try {
    const release = await getBrowserReleaseReconciliationSnapshot(id, context.workspaceId);
    const candidates = await findReleaseTransactionCandidates(release);
    return NextResponse.json({ candidates });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNABLE_TO_FIND_RELEASE_TRANSACTION";
    const status = code === "RELEASE_NOT_FOUND" ? 404 : code === "RELEASE_NOT_RECONCILABLE" ? 409 : 502;
    return NextResponse.json({ error: code }, { status });
  }
}
