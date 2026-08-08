import { NextResponse } from "next/server";
import { activatePayout } from "@/lib/repositories/payout-activation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (typeof body.workspaceId !== "string" || body.workspaceId.trim().length === 0 ||
        typeof body.activatedByUserId !== "string" || body.activatedByUserId.trim().length === 0) {
      return NextResponse.json({ error: "workspaceId and activatedByUserId are required.", code: "INVALID_ACTIVATE_PAYLOAD" }, { status: 400 });
    }

    const payout = await activatePayout(id, body.workspaceId, body.activatedByUserId);
    return NextResponse.json({ payout });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_JSON_BODY" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "PAYOUT_NOT_FOUND") {
        return NextResponse.json({ error: "Payout not found.", code: error.message }, { status: 404 });
      }
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json({ error: "Activator not found.", code: error.message }, { status: 404 });
      }
      if (error.message === "USER_NOT_ALLOWED_TO_ACTIVATE_PAYOUT") {
        return NextResponse.json({ error: "User is not allowed to activate payouts in this workspace.", code: error.message }, { status: 403 });
      }
      if (error.message === "PAYOUT_NOT_DRAFT") {
        return NextResponse.json({ error: "Only draft payouts can be activated.", code: error.message }, { status: 409 });
      }
      if (error.message === "PAYOUT_INCOMPLETE") {
        return NextResponse.json({ error: "Payout is missing a target wallet or milestone.", code: error.message }, { status: 400 });
      }
      if (error.message === "MILESTONE_TOTAL_MISMATCH") {
        return NextResponse.json({ error: "Milestone amounts must equal the payout total.", code: error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Unable to activate payout.", code: "UNABLE_TO_ACTIVATE_PAYOUT" }, { status: 500 });
  }
}
