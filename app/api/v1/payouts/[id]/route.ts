import { NextResponse } from "next/server";
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
  if (!detail) return NextResponse.json({ error: "Payout not found." }, { status: 404 });
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
      return NextResponse.json({ error: "workspaceId is required.", code: "INVALID_PAYOUT_UPDATE_PAYLOAD" }, { status: 400 });
    }
    const allowed = ["title", "description", "contributorId", "targetWalletAddress", "totalAmountUsdc", "milestones"];
    if (Object.keys(body).some((key) => key !== "workspaceId" && !allowed.includes(key))) {
      return NextResponse.json({ error: "Unknown payout field.", code: "UNKNOWN_PAYOUT_FIELD" }, { status: 400 });
    }
    if (body.title !== undefined && !isNonEmpty(body.title)) {
      return NextResponse.json({ error: "title must not be empty.", code: "EMPTY_PAYOUT_TITLE" }, { status: 400 });
    }
    if (body.milestones !== undefined && (!Array.isArray(body.milestones) || body.milestones.length === 0)) {
      return NextResponse.json({ error: "At least one milestone is required.", code: "EMPTY_PAYOUT_MILESTONES" }, { status: 400 });
    }

    const payout = await updatePayoutDraft(id, body.workspaceId, body);
    return NextResponse.json({ payout });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_JSON_BODY" }, { status: 400 });
    if (error instanceof Error && error.message === "PAYOUT_NOT_FOUND") return NextResponse.json({ error: "Payout not found.", code: error.message }, { status: 404 });
    if (error instanceof Error && error.message === "PAYOUT_NOT_DRAFT") return NextResponse.json({ error: "Only draft payouts can be edited.", code: error.message }, { status: 409 });
    if (error instanceof Error && error.message === "CONTRIBUTOR_NOT_FOUND") return NextResponse.json({ error: "Contributor not found.", code: error.message }, { status: 404 });
    return NextResponse.json({ error: "Unable to update payout.", code: "UNABLE_TO_UPDATE_PAYOUT" }, { status: 500 });
  }
}
