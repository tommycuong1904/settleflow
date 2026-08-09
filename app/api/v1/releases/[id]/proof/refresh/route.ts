import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { refreshReleaseProof, type RefreshProofInput } from "@/lib/repositories/release-proof";
import { assertCanRefreshProof } from "@/lib/runtime/product-policy";
import { resolveProductContextFromRequest } from "@/lib/runtime/product-context-server";

const statuses = new Set(["confirmed", "failed"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as Partial<RefreshProofInput> | null;
  if (!body || typeof body.status !== "string" || !statuses.has(body.status)) {
    return apiError("INVALID_PROOF_STATUS", { message: "status must be confirmed or failed.", status: 400 });
  }

  const productContext = resolveProductContextFromRequest(request);
  const actorUserId = productContext.ownerUserId;

  if (typeof actorUserId !== "string" || actorUserId.trim().length === 0) {
    return apiError("INVALID_PROOF_REFRESH_PAYLOAD", { message: "owner context is required.", status: 400 });
  }

  const policyViolation = assertCanRefreshProof({ productContext, actorUserId: actorUserId });
  if (policyViolation) {
    return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
  }

  try {
    const result = await refreshReleaseProof(id, actorUserId, body as RefreshProofInput);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return apiErrorFromCode(
      code,
      {
        RELEASE_NOT_FOUND: 404,
        MILESTONE_NOT_FOUND: 404,
        PROOF_NOT_FOUND: 404,
        PROOF_NOT_PENDING: 409,
        RELEASE_NOT_REFRESHABLE: 409,
        STALE_PROOF_REFRESH: 409,
        TX_HASH_REQUIRED: 400,
        FAILURE_REASON_REQUIRED: 400,
        FORBIDDEN_PROOF_REFRESH: 403,
      },
      {},
      { status: 500 },
    );
  }
}
