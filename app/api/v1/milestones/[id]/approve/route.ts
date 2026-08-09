import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { reviewMilestone } from "@/lib/repositories/milestone-review";
import { assertCanApproveMilestone } from "@/lib/runtime/product-policy";
import { resolveProductContextFromRequest } from "@/lib/runtime/product-context-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const productContext = resolveProductContextFromRequest(request);
    const reviewerUserId = productContext.activeUserId;

    if (typeof reviewerUserId !== "string" || reviewerUserId.trim().length === 0) {
      return apiError("INVALID_REVIEW_PAYLOAD", { message: "reviewer context is required.", status: 400 });
    }

    const policyViolation = assertCanApproveMilestone({ productContext, actorUserId: reviewerUserId });
    if (policyViolation) {
      return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
    }
    const result = await reviewMilestone(id, reviewerUserId, productContext.workspaceId, "approved", undefined);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNABLE_TO_APPROVE_MILESTONE";
    return apiErrorFromCode(
      code,
      {
        MILESTONE_NOT_FOUND: 404,
        WORKSPACE_SCOPE_MISMATCH: 409,
        USER_NOT_FOUND: 404,
        USER_NOT_ALLOWED_TO_REVIEW: 403,
        MILESTONE_NOT_REVIEWABLE: 409,
      },
      {
        MILESTONE_NOT_FOUND: "Milestone not found.",
        USER_NOT_FOUND: "Reviewer context user not found.",
        USER_NOT_ALLOWED_TO_REVIEW: "User is not allowed to review this milestone.",
        MILESTONE_NOT_REVIEWABLE: "Milestone has no submitted work to review.",
      },
      { message: "Unable to approve milestone.", status: 500 },
    );
  }
}
