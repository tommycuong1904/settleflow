import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import {
  derivePatchedTotalAmountUsdc,
  hasContiguousMilestoneSequences,
  hasOnlyAllowedPayoutUpdateFields,
  hasValidMilestoneShape,
  isNonEmptyString,
} from "@/lib/api/payout-payload";
import { getPayoutDetail } from "@/lib/repositories/payouts";
import { updatePayoutDraft } from "@/lib/repositories/payout-editing";
import { assertCanEditPayoutDraft } from "@/lib/runtime/product-policy";
import { resolveProductContextFromRequest } from "@/lib/runtime/product-context-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const productContext = resolveProductContextFromRequest(request);

  try {
    const detail = await getPayoutDetail(id, productContext.workspaceId);
    if (!detail) return apiError("PAYOUT_NOT_FOUND", { message: "Payout not found.", status: 404 });
    return NextResponse.json({ data: detail });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNABLE_TO_LOAD_PAYOUT";
    return apiErrorFromCode(
      code,
      {
        WORKSPACE_SCOPE_MISMATCH: 409,
      },
      {
        WORKSPACE_SCOPE_MISMATCH: "workspace context does not match the payout workspace.",
      },
      { message: "Unable to load payout.", status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const productContext = resolveProductContextFromRequest(request);
    const body = await request.json();
    if (!isNonEmptyString(productContext.workspaceId)) {
      return apiError("INVALID_PAYOUT_UPDATE_PAYLOAD", { message: "workspace context is required.", status: 400 });
    }
    if (!hasOnlyAllowedPayoutUpdateFields(body)) {
      return apiError("UNKNOWN_PAYOUT_FIELD", { message: "Unknown payout field.", status: 400 });
    }
    if (body.title !== undefined && !isNonEmptyString(body.title)) {
      return apiError("EMPTY_PAYOUT_TITLE", { message: "title must not be empty.", status: 400 });
    }
    if (body.milestones !== undefined && (!Array.isArray(body.milestones) || body.milestones.length === 0)) {
      return apiError("EMPTY_PAYOUT_MILESTONES", { message: "At least one milestone is required.", status: 400 });
    }

    if (Array.isArray(body.milestones)) {
      const milestonePayload = body.milestones as Array<{
        title: unknown;
        description: unknown;
        amountUsdc: unknown;
        sequence: unknown;
      }>;

      if (!hasValidMilestoneShape(milestonePayload)) {
        return apiError("INVALID_MILESTONE_PAYLOAD", { message: "Invalid milestone payload.", status: 400 });
      }

      if (!hasContiguousMilestoneSequences(milestonePayload)) {
        return apiError("INVALID_MILESTONE_SEQUENCE", { message: "Milestone sequence must start at 1 and stay contiguous.", status: 400 });
      }

      body.totalAmountUsdc = derivePatchedTotalAmountUsdc(milestonePayload);
    }

    const policyViolation = assertCanEditPayoutDraft({ productContext, actorUserId: productContext.ownerUserId });
    if (policyViolation) {
      return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
    }

    const payout = await updatePayoutDraft(id, productContext.workspaceId, body, productContext.ownerUserId);
    return NextResponse.json({ payout });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });

    const code = error instanceof Error ? error.message : "UNABLE_TO_UPDATE_PAYOUT";
    return apiErrorFromCode(
      code,
      {
        PAYOUT_NOT_FOUND: 404,
        WORKSPACE_SCOPE_MISMATCH: 409,
        PAYOUT_NOT_DRAFT: 409,
        CONTRIBUTOR_NOT_FOUND: 404,
        INVALID_MILESTONE_PAYLOAD: 400,
        INVALID_MILESTONE_SEQUENCE: 400,
        FORBIDDEN_PAYOUT_EDIT_ACTOR: 403,
        FORBIDDEN_PAYOUT_EDIT_CONTEXT: 403,
      },
      {
        PAYOUT_NOT_FOUND: "Payout not found.",
        WORKSPACE_SCOPE_MISMATCH: "workspace context does not match the payout workspace.",
        PAYOUT_NOT_DRAFT: "Only draft payouts can be edited.",
        CONTRIBUTOR_NOT_FOUND: "Contributor not found.",
        INVALID_MILESTONE_PAYLOAD: "Invalid milestone payload.",
        INVALID_MILESTONE_SEQUENCE: "Milestone sequence must start at 1 and stay contiguous.",
        FORBIDDEN_PAYOUT_EDIT_ACTOR: "Only owners can edit draft payouts in this flow.",
        FORBIDDEN_PAYOUT_EDIT_CONTEXT: "Edit payout context does not match the active owner.",
      },
      { message: "Unable to update payout.", status: 500 },
    );
  }
}
