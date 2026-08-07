import { NextResponse } from "next/server";
import { activatePayout } from "@/lib/repositories/payout-activation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (typeof body.workspaceId !== "string" || body.workspaceId.trim().length === 0) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }

    const payout = await activatePayout(id, body.workspaceId);
    return NextResponse.json({ payout });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "PAYOUT_NOT_FOUND") {
        return NextResponse.json({ error: "Payout not found." }, { status: 404 });
      }
      if (error.message === "PAYOUT_NOT_DRAFT") {
        return NextResponse.json({ error: "Only draft payouts can be activated." }, { status: 409 });
      }
      if (error.message === "PAYOUT_INCOMPLETE") {
        return NextResponse.json({ error: "Payout is missing a target wallet or milestone." }, { status: 400 });
      }
      if (error.message === "MILESTONE_TOTAL_MISMATCH") {
        return NextResponse.json({ error: "Milestone amounts must equal the payout total." }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Unable to activate payout." }, { status: 500 });
  }
}
