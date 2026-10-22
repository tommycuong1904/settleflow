import { NextResponse } from "next/server";

import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { isValidUsdcAmount } from "@/lib/api/payout-payload";
import { completeSimulatedPayment } from "@/lib/repositories/simulated-payment";
import { assertCanReleaseMilestone } from "@/lib/runtime/product-policy";
import { resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    const body = await request.json() as { amountUsdc?: unknown };
    const ownerUserId = productContext.ownerUserId;
    if (!isValidUsdcAmount(body.amountUsdc)) return apiError("INVALID_PAYMENT_PAYLOAD", { message: "A valid amountUsdc is required.", status: 400 });
    const violation = assertCanReleaseMilestone({ productContext, actorUserId: ownerUserId });
    if (violation) return apiError(violation.code, { message: violation.message, status: violation.status });
    const result = await completeSimulatedPayment(id, ownerUserId, productContext.workspaceId, body.amountUsdc);
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });
    const code = error instanceof Error ? error.message : "UNABLE_TO_COMPLETE_SIMULATED_PAYMENT";
    return apiErrorFromCode(code, {
      MILESTONE_NOT_FOUND: 404,
      MILESTONE_NOT_APPROVED: 409,
      PAYOUT_NOT_RELEASE_READY: 409,
      PAYMENT_ATTEMPT_EXISTS: 409,
      PAYMENT_AMOUNT_MISMATCH: 400,
      INVALID_PAYMENT_AMOUNT: 400,
      SIMULATED_PAYMENT_DISABLED: 409,
      USER_NOT_FOUND: 404,
      USER_NOT_ALLOWED_TO_RELEASE: 403,
    }, {
      MILESTONE_NOT_APPROVED: "Milestone must be approved before payment.",
      PAYMENT_ATTEMPT_EXISTS: "A payment attempt already exists for this milestone.",
      PAYMENT_AMOUNT_MISMATCH: "Payment amount must match the milestone amount.",
      SIMULATED_PAYMENT_DISABLED: "Simulated payments are unavailable while real execution is enabled.",
    }, { message: "Unable to record the simulated payment.", status: 500 });
  }
}
