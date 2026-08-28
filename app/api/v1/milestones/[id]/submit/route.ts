import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { hasContributorSubmissionPayload } from "@/lib/api/milestone-payload";
import { submitMilestone } from "@/lib/repositories/milestone-submission";
import { assertCanSubmitMilestone } from "@/lib/runtime/product-policy";
import { resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    const body = await request.json();
    const contributorUserId = productContext.activeUserId;

    if (!hasContributorSubmissionPayload({ contributorUserId, summary: body.summary })) {
      return apiError("INVALID_SUBMIT_PAYLOAD", { message: "contributor context and summary are required.", status: 400 });
    }

    const policyViolation = assertCanSubmitMilestone({ productContext, actorUserId: contributorUserId });
    if (policyViolation) {
      return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
    }
    const result = await submitMilestone(id, productContext.workspaceId, { ...body, contributorUserId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });

    const code = error instanceof Error ? error.message : "UNABLE_TO_SUBMIT_MILESTONE";
    return apiErrorFromCode(
      code,
      {
        MILESTONE_NOT_FOUND: 404,
        WORKSPACE_SCOPE_MISMATCH: 409,
        USER_NOT_FOUND: 404,
        USER_NOT_ALLOWED_TO_SUBMIT: 403,
        MILESTONE_NOT_SUBMITTABLE: 409,
      },
      {
        MILESTONE_NOT_FOUND: "Milestone not found.",
        USER_NOT_FOUND: "Contributor context user not found.",
        USER_NOT_ALLOWED_TO_SUBMIT: "User is not allowed to submit for this milestone.",
        MILESTONE_NOT_SUBMITTABLE: "Milestone cannot be submitted in its current state.",
      },
      { message: "Unable to submit milestone.", status: 500 },
    );
  }
}
