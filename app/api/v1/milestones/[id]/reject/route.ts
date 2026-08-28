import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { hasReviewerContext } from "@/lib/api/milestone-payload";
import { reviewMilestone } from "@/lib/repositories/milestone-review";
import { assertCanRejectMilestone } from "@/lib/runtime/product-policy";
import { resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    const body = await request.json();
    const reviewerUserId = productContext.activeUserId;

    if (!hasReviewerContext(reviewerUserId)) {
      return apiError("INVALID_REVIEW_PAYLOAD", { message: "reviewer context is required.", status: 400 });
    }

    const policyViolation = assertCanRejectMilestone({ productContext, actorUserId: reviewerUserId });
    if (policyViolation) {
      return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
    }
    const result = await reviewMilestone(id, reviewerUserId, productContext.workspaceId, "rejected", body.comment);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });

    const code = error instanceof Error ? error.message : "UNABLE_TO_REJECT_MILESTONE";
    return apiErrorFromCode(
      code,
      {
        MILESTONE_NOT_FOUND: 404,
        WORKSPACE_SCOPE_MISMATCH: 409,
        USER_NOT_FOUND: 404,
        USER_NOT_ALLOWED_TO_REVIEW: 403,
        MILESTONE_NOT_REVIEWABLE: 409,
        REJECTION_COMMENT_REQUIRED: 400,
      },
      {
        MILESTONE_NOT_FOUND: "Milestone not found.",
        USER_NOT_FOUND: "Reviewer context user not found.",
        USER_NOT_ALLOWED_TO_REVIEW: "User is not allowed to review this milestone.",
        MILESTONE_NOT_REVIEWABLE: "Milestone has no submitted work to review.",
        REJECTION_COMMENT_REQUIRED: "A rejection comment is required.",
      },
      { message: "Unable to reject milestone.", status: 500 },
    );
  }
}
