import { NextResponse } from "next/server";
import { submitMilestone } from "@/lib/repositories/milestone-submission";

function required(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const submittedByUserId = required(body.submittedByUserId)
      ? body.submittedByUserId
      : body.triggeredByUserId;

    if (!required(submittedByUserId) || !required(body.summary)) {
      return NextResponse.json({ error: "submittedByUserId and summary are required.", code: "INVALID_SUBMIT_PAYLOAD" }, { status: 400 });
    }
    const result = await submitMilestone(id, { ...body, submittedByUserId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_JSON_BODY" }, { status: 400 });
    if (error instanceof Error && error.message === "MILESTONE_NOT_FOUND") return NextResponse.json({ error: "Milestone not found.", code: error.message }, { status: 404 });
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "Submitter not found.", code: error.message }, { status: 404 });
    if (error instanceof Error && error.message === "USER_NOT_ALLOWED_TO_SUBMIT") return NextResponse.json({ error: "User is not allowed to submit for this milestone.", code: error.message }, { status: 403 });
    if (error instanceof Error && error.message === "MILESTONE_NOT_SUBMITTABLE") return NextResponse.json({ error: "Milestone cannot be submitted in its current state.", code: error.message }, { status: 409 });
    return NextResponse.json({ error: "Unable to submit milestone.", code: "UNABLE_TO_SUBMIT_MILESTONE" }, { status: 500 });
  }
}
