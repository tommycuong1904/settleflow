import { NextResponse } from "next/server";
import { getPayoutById } from "@/lib/repositories/payouts";
import { updatePayoutDraft } from "@/lib/repositories/payout-editing";

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const payout = await getPayoutById(id, searchParams.get("workspaceId") ?? undefined);
  if (!payout) return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  return NextResponse.json({ data: payout });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (!isNonEmpty(body.workspaceId)) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }
    const allowed = ["title", "description", "contributorId", "targetWalletAddress", "totalAmountUsdc", "milestones"];
    if (Object.keys(body).some((key) => key !== "workspaceId" && !allowed.includes(key))) {
      return NextResponse.json({ error: "Unknown payout field." }, { status: 400 });
    }
    if (body.title !== undefined && !isNonEmpty(body.title)) {
      return NextResponse.json({ error: "title must not be empty." }, { status: 400 });
    }
    if (body.milestones !== undefined && (!Array.isArray(body.milestones) || body.milestones.length === 0)) {
      return NextResponse.json({ error: "At least one milestone is required." }, { status: 400 });
    }

    const payout = await updatePayoutDraft(id, body.workspaceId, body);
    return NextResponse.json({ payout });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    if (error instanceof Error && error.message === "PAYOUT_NOT_FOUND") return NextResponse.json({ error: "Payout not found." }, { status: 404 });
    if (error instanceof Error && error.message === "PAYOUT_NOT_DRAFT") return NextResponse.json({ error: "Only draft payouts can be edited." }, { status: 409 });
    if (error instanceof Error && error.message === "CONTRIBUTOR_NOT_FOUND") return NextResponse.json({ error: "Contributor not found." }, { status: 404 });
    return NextResponse.json({ error: "Unable to update payout." }, { status: 500 });
  }
}
