import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { activatePayout } from "@/lib/repositories/payout-activation";
import { assertCanActivatePayout } from "@/lib/runtime/product-policy";
import { resolveProductContext } from "@/lib/runtime/product-context-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const productContext = resolveProductContext(body ?? {});
    const activatedByUserId =
      typeof body.activatedByUserId === "string" && body.activatedByUserId.trim().length > 0
        ? body.activatedByUserId
        : body.triggeredByUserId ?? productContext.ownerUserId;

    if (typeof productContext.workspaceId !== "string" || productContext.workspaceId.trim().length === 0 ||
        typeof activatedByUserId !== "string" || activatedByUserId.trim().length === 0) {
      return apiError("INVALID_ACTIVATE_PAYLOAD", { message: "workspaceId and activatedByUserId are required.", status: 400 });
    }

    const policyViolation = assertCanActivatePayout(productContext.actor);
    if (policyViolation) {
      return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
    }

    const payout = await activatePayout(id, productContext.workspaceId, activatedByUserId);
    return NextResponse.json({ payout });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });
    }

    const code = error instanceof Error ? error.message : "UNABLE_TO_ACTIVATE_PAYOUT";
    return apiErrorFromCode(
      code,
      {
        PAYOUT_NOT_FOUND: 404,
        WORKSPACE_SCOPE_MISMATCH: 409,
        USER_NOT_FOUND: 404,
        USER_NOT_ALLOWED_TO_ACTIVATE_PAYOUT: 403,
        PAYOUT_NOT_DRAFT: 409,
        PAYOUT_INCOMPLETE: 400,
        MILESTONE_TOTAL_MISMATCH: 400,
      },
      {
        PAYOUT_NOT_FOUND: "Payout not found.",
        WORKSPACE_SCOPE_MISMATCH: "workspaceId does not match the payout workspace.",
        USER_NOT_FOUND: "Activator not found.",
        USER_NOT_ALLOWED_TO_ACTIVATE_PAYOUT: "User is not allowed to activate payouts in this workspace.",
        PAYOUT_NOT_DRAFT: "Only draft payouts can be activated.",
        PAYOUT_INCOMPLETE: "Payout is missing a target wallet or milestone.",
        MILESTONE_TOTAL_MISMATCH: "Milestone amounts must equal the payout total.",
      },
      { message: "Unable to activate payout.", status: 500 },
    );
  }
}
