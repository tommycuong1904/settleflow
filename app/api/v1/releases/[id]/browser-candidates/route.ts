import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { findReleaseTransactionCandidates } from "@/lib/arc/find-release-transaction";
import { getBrowserReleaseReconciliationSnapshot } from "@/lib/repositories/release-proof";
import { assertCanRefreshProof } from "@/lib/runtime/product-policy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }
  let context;
  try {
    context = await resolveProductContextFromRequestWithSession(request);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNABLE_TO_RESOLVE_RELEASE_CONTEXT";
    return apiErrorFromCode(code, {}, {}, { message: "Unable to resolve payment context.", status: 500 });
  }
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
