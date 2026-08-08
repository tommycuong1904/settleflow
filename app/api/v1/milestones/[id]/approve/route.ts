import { NextResponse } from "next/server";
import { reviewMilestone } from "@/lib/repositories/milestone-review";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const reviewedByUserId =
      typeof body.reviewedByUserId === "string" && body.reviewedByUserId.trim().length > 0
        ? body.reviewedByUserId
        : body.triggeredByUserId;

    if (typeof reviewedByUserId !== "string" || reviewedByUserId.trim().length === 0) {
      return NextResponse.json({ error: "reviewedByUserId is required.", code: "INVALID_REVIEW_PAYLOAD" }, { status: 400 });
    }
    const result = await reviewMilestone(id, reviewedByUserId, "approved", body.comment);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_JSON_BODY" }, { status: 400 });
    if (error instanceof Error && error.message === "MILESTONE_NOT_FOUND") return NextResponse.json({ error: "Milestone not found.", code: error.message }, { status: 404 });
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "Reviewer not found.", code: error.message }, { status: 404 });
    if (error instanceof Error && error.message === "USER_NOT_ALLOWED_TO_REVIEW") return NextResponse.json({ error: "User is not allowed to review this milestone.", code: error.message }, { status: 403 });
    if (error instanceof Error && error.message === "MILESTONE_NOT_REVIEWABLE") return NextResponse.json({ error: "Milestone has no submitted work to review.", code: error.message }, { status: 409 });
    return NextResponse.json({ error: "Unable to approve milestone.", code: "UNABLE_TO_APPROVE_MILESTONE" }, { status: 500 });
  }
}
