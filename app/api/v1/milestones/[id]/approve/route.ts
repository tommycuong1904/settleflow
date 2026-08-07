import { NextResponse } from "next/server";
import { reviewMilestone } from "@/lib/repositories/milestone-review";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (typeof body.reviewedByUserId !== "string" || body.reviewedByUserId.trim().length === 0) {
      return NextResponse.json({ error: "reviewedByUserId is required." }, { status: 400 });
    }
    const result = await reviewMilestone(id, body.reviewedByUserId, "approved", body.comment);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    if (error instanceof Error && error.message === "MILESTONE_NOT_FOUND") return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "Reviewer not found." }, { status: 404 });
    if (error instanceof Error && error.message === "MILESTONE_NOT_REVIEWABLE") return NextResponse.json({ error: "Milestone has no submitted work to review." }, { status: 409 });
    return NextResponse.json({ error: "Unable to approve milestone." }, { status: 500 });
  }
}
