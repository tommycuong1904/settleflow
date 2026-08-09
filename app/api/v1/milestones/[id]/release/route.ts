import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { queueMilestoneRelease } from "@/lib/repositories/milestone-release";
import { assertCanReleaseMilestone } from "@/lib/runtime/product-policy";
import { resolveProductContextFromRequest } from "@/lib/runtime/product-context-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const productContext = resolveProductContextFromRequest(request);
    const body = await request.json();
    const ownerUserId = productContext.ownerUserId;
    if (typeof ownerUserId !== "string" || ownerUserId.trim().length === 0 ||
        typeof body.amountUsdc !== "string" || body.amountUsdc.trim().length === 0) {
      return apiError("INVALID_RELEASE_PAYLOAD", { message: "owner context and amountUsdc are required.", status: 400 });
    }

    const policyViolation = assertCanReleaseMilestone({ productContext, actorUserId: ownerUserId });
    if (policyViolation) {
      return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
    }
    const result = await queueMilestoneRelease(id, ownerUserId, productContext.workspaceId, body.amountUsdc);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });

    const code = error instanceof Error ? error.message : "UNABLE_TO_QUEUE_RELEASE";
    return apiErrorFromCode(
      code,
      {
        MILESTONE_NOT_FOUND: 404,
        WORKSPACE_SCOPE_MISMATCH: 409,
        USER_NOT_FOUND: 404,
        USER_NOT_ALLOWED_TO_RELEASE: 403,
        MILESTONE_NOT_APPROVED: 409,
        PAYOUT_NOT_RELEASE_READY: 409,
        RELEASE_ALREADY_EXISTS: 409,
        DESTINATION_WALLET_MISSING: 400,
        RELEASE_AMOUNT_MISMATCH: 400,
      },
      {
        MILESTONE_NOT_FOUND: "Milestone not found.",
        USER_NOT_FOUND: "Owner context user not found.",
        USER_NOT_ALLOWED_TO_RELEASE: "User is not allowed to release this milestone.",
        MILESTONE_NOT_APPROVED: "Milestone must be approved before release.",
        PAYOUT_NOT_RELEASE_READY: "Payout is not in a release-ready state for settlement.",
        RELEASE_ALREADY_EXISTS: "A release already exists for this milestone.",
        DESTINATION_WALLET_MISSING: "Destination wallet is missing.",
        RELEASE_AMOUNT_MISMATCH: "Release amount must match the milestone amount.",
      },
      { message: "Unable to queue release.", status: 500 },
    );
  }
}
