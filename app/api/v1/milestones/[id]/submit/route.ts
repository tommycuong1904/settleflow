import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
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
      return apiError("INVALID_SUBMIT_PAYLOAD", { message: "submittedByUserId and summary are required.", status: 400 });
    }
    const result = await submitMilestone(id, { ...body, submittedByUserId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });

    const code = error instanceof Error ? error.message : "UNABLE_TO_SUBMIT_MILESTONE";
    return apiErrorFromCode(
      code,
      {
        MILESTONE_NOT_FOUND: 404,
        USER_NOT_FOUND: 404,
        USER_NOT_ALLOWED_TO_SUBMIT: 403,
        MILESTONE_NOT_SUBMITTABLE: 409,
      },
      {
        MILESTONE_NOT_FOUND: "Milestone not found.",
        USER_NOT_FOUND: "Submitter not found.",
        USER_NOT_ALLOWED_TO_SUBMIT: "User is not allowed to submit for this milestone.",
        MILESTONE_NOT_SUBMITTABLE: "Milestone cannot be submitted in its current state.",
      },
      { message: "Unable to submit milestone.", status: 500 },
    );
  }
}
