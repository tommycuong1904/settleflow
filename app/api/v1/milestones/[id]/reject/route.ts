import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { reviewMilestone } from "@/lib/repositories/milestone-review";
import { resolveProductContext } from "@/lib/runtime/product-context-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const productContext = resolveProductContext(body ?? {});
    const reviewedByUserId =
      typeof body.reviewedByUserId === "string" && body.reviewedByUserId.trim().length > 0
        ? body.reviewedByUserId
        : body.triggeredByUserId ?? productContext.reviewerUserId;

    if (typeof reviewedByUserId !== "string" || reviewedByUserId.trim().length === 0) {
      return apiError("INVALID_REVIEW_PAYLOAD", { message: "reviewedByUserId is required.", status: 400 });
    }
    const result = await reviewMilestone(id, reviewedByUserId, "rejected", body.comment);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });

    const code = error instanceof Error ? error.message : "UNABLE_TO_REJECT_MILESTONE";
    return apiErrorFromCode(
      code,
      {
        MILESTONE_NOT_FOUND: 404,
        USER_NOT_FOUND: 404,
        USER_NOT_ALLOWED_TO_REVIEW: 403,
        MILESTONE_NOT_REVIEWABLE: 409,
        REJECTION_COMMENT_REQUIRED: 400,
      },
      {
        MILESTONE_NOT_FOUND: "Milestone not found.",
        USER_NOT_FOUND: "Reviewer not found.",
        USER_NOT_ALLOWED_TO_REVIEW: "User is not allowed to review this milestone.",
        MILESTONE_NOT_REVIEWABLE: "Milestone has no submitted work to review.",
        REJECTION_COMMENT_REQUIRED: "A rejection comment is required.",
      },
      { message: "Unable to reject milestone.", status: 500 },
    );
  }
}
