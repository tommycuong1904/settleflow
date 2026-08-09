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

  let body: Partial<RefreshProofInput> | null;
  try {
    body = await request.json() as Partial<RefreshProofInput>;
  } catch {
    return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });
  }

  if (!body || typeof body.status !== "string" || !statuses.has(body.status)) {
    return apiError("INVALID_PROOF_STATUS", { message: "status must be confirmed or failed.", status: 400 });
  }

  const productContext = resolveProductContextFromRequest(request);
  const ownerUserId = productContext.ownerUserId;

  if (
    typeof productContext.workspaceId !== "string"
    || productContext.workspaceId.trim().length === 0
    || typeof ownerUserId !== "string"
    || ownerUserId.trim().length === 0
  ) {
    return apiError("INVALID_PROOF_REFRESH_PAYLOAD", {
      message: "owner and workspace context are required.",
      status: 400,
    });
  }

  const policyViolation = assertCanRefreshProof({ productContext, actorUserId: ownerUserId });
  if (policyViolation) {
    return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
  }

  try {
    const result = await refreshReleaseProof(id, ownerUserId, productContext.workspaceId, body as RefreshProofInput);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return apiErrorFromCode(
      code,
      {
        RELEASE_NOT_FOUND: 404,
        WORKSPACE_SCOPE_MISMATCH: 409,
        MILESTONE_NOT_FOUND: 404,
        PROOF_NOT_FOUND: 404,
        PROOF_NOT_PENDING: 409,
        MILESTONE_NOT_APPROVED_FOR_CONFIRMATION: 409,
        RELEASE_NOT_REFRESHABLE: 409,
        STALE_PROOF_REFRESH: 409,
        TX_HASH_REQUIRED: 400,
        FAILURE_REASON_REQUIRED: 400,
        FORBIDDEN_PROOF_REFRESH: 403,
      },
      {
        RELEASE_NOT_FOUND: "Release not found.",
        WORKSPACE_SCOPE_MISMATCH: "Workspace context does not match the release workspace.",
        MILESTONE_NOT_FOUND: "Milestone not found for this release.",
        PROOF_NOT_FOUND: "Settlement proof not found for this release.",
        PROOF_NOT_PENDING: "Only pending proofs can be refreshed.",
        MILESTONE_NOT_APPROVED_FOR_CONFIRMATION: "This milestone is no longer approved for settlement confirmation.",
        RELEASE_NOT_REFRESHABLE: "This release is not in a refreshable state.",
        STALE_PROOF_REFRESH: "This proof refresh no longer applies to the active release attempt.",
        TX_HASH_REQUIRED: "A transaction hash is required when confirming settlement.",
        FAILURE_REASON_REQUIRED: "A failure reason is required when marking settlement as failed.",
        FORBIDDEN_PROOF_REFRESH: "User is not allowed to refresh this settlement proof.",
      },
      { message: "Unable to refresh settlement proof.", status: 500 },
    );
  }
}
