import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { hasOwnerWorkspaceContext } from "@/lib/api/release-payload";
import { retryFailedRelease } from "@/lib/repositories/release-retry";
import { assertCanRetryRelease } from "@/lib/runtime/product-policy";
import { resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const productContext = await resolveProductContextFromRequestWithSession(request);
  const ownerUserId = productContext.ownerUserId;

  if (!hasOwnerWorkspaceContext({ workspaceId: productContext.workspaceId, ownerUserId })) {
    return apiError("INVALID_RELEASE_RETRY_PAYLOAD", {
      message: "owner and workspace context are required.",
      status: 400,
    });
  }

  const policyViolation = assertCanRetryRelease({ productContext, actorUserId: ownerUserId });
  if (policyViolation) {
    return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
  }

  try {
    const result = await retryFailedRelease(id, ownerUserId, productContext.workspaceId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return apiErrorFromCode(
      code,
      {
        RELEASE_NOT_FOUND: 404,
        WORKSPACE_SCOPE_MISMATCH: 409,
        RELEASE_NOT_FAILED: 409,
        MILESTONE_NOT_APPROVED_FOR_RETRY: 409,
        STALE_RELEASE_RETRY: 409,
        PROOF_NOT_FOUND: 404,
        RETRY_REQUIRES_FAILED_PROOF: 409,
        DESTINATION_WALLET_MISSING: 422,
        USER_NOT_FOUND: 404,
        FORBIDDEN_RELEASE_RETRY: 403,
      },
      {
        RELEASE_NOT_FOUND: "Release not found.",
        WORKSPACE_SCOPE_MISMATCH: "Workspace context does not match the release workspace.",
        RELEASE_NOT_FAILED: "Only failed releases can be retried.",
        MILESTONE_NOT_APPROVED_FOR_RETRY: "This milestone is no longer approved for settlement retry.",
        STALE_RELEASE_RETRY: "This release was already retried and is no longer the active failed attempt.",
        PROOF_NOT_FOUND: "Settlement proof not found for this release.",
        RETRY_REQUIRES_FAILED_PROOF: "Only releases with a failed proof can be retried.",
        DESTINATION_WALLET_MISSING: "Destination wallet is missing.",
        USER_NOT_FOUND: "Owner context user not found.",
        FORBIDDEN_RELEASE_RETRY: "User is not allowed to retry this release.",
      },
      { message: "Unable to retry release.", status: 500 },
    );
  }
}
