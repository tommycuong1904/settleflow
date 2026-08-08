import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { getPayoutDetail } from "@/lib/repositories/payouts";
import { updatePayoutDraft } from "@/lib/repositories/payout-editing";

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getPayoutDetail(id);
  if (!detail) return apiError("PAYOUT_NOT_FOUND", { message: "Payout not found.", status: 404 });
  return NextResponse.json({ data: detail });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (!isNonEmpty(body.workspaceId)) {
      return apiError("INVALID_PAYOUT_UPDATE_PAYLOAD", { message: "workspaceId is required.", status: 400 });
    }
    const allowed = ["title", "description", "contributorId", "targetWalletAddress", "totalAmountUsdc", "milestones"];
    if (Object.keys(body).some((key) => key !== "workspaceId" && !allowed.includes(key))) {
      return apiError("UNKNOWN_PAYOUT_FIELD", { message: "Unknown payout field.", status: 400 });
    }
    if (body.title !== undefined && !isNonEmpty(body.title)) {
      return apiError("EMPTY_PAYOUT_TITLE", { message: "title must not be empty.", status: 400 });
    }
    if (body.milestones !== undefined && (!Array.isArray(body.milestones) || body.milestones.length === 0)) {
      return apiError("EMPTY_PAYOUT_MILESTONES", { message: "At least one milestone is required.", status: 400 });
    }

    const payout = await updatePayoutDraft(id, body.workspaceId, body);
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
      },
      {
        PAYOUT_NOT_FOUND: "Payout not found.",
        WORKSPACE_SCOPE_MISMATCH: "workspaceId does not match the payout workspace.",
        PAYOUT_NOT_DRAFT: "Only draft payouts can be edited.",
        CONTRIBUTOR_NOT_FOUND: "Contributor not found.",
      },
      { message: "Unable to update payout.", status: 500 },
    );
  }
}
