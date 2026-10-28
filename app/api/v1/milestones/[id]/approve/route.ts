import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { hasReviewerContext } from "@/lib/api/milestone-payload";
import { reviewMilestone } from "@/lib/repositories/milestone-review";
import { assertCanApproveMilestone } from "@/lib/runtime/product-policy";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }
  const { id } = await params;
  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    const reviewerUserId = productContext.activeUserId;

    if (!hasReviewerContext(reviewerUserId)) {
      return apiError("INVALID_REVIEW_PAYLOAD", { message: "owner context is required.", status: 400 });
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
        USER_NOT_ALLOWED_TO_REVIEW: "Only the workspace owner can review this milestone.",
        MILESTONE_NOT_REVIEWABLE: "Milestone has no submitted work to review.",
      },
      { message: "Unable to approve milestone.", status: 500 },
    );
  }
}
