import { NextResponse } from "next/server";
import { queueMilestoneRelease } from "@/lib/repositories/milestone-release";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (typeof body.triggeredByUserId !== "string" || body.triggeredByUserId.trim().length === 0 ||
        typeof body.amountUsdc !== "string" || body.amountUsdc.trim().length === 0) {
      return NextResponse.json({ error: "triggeredByUserId and amountUsdc are required." }, { status: 400 });
    }
    const result = await queueMilestoneRelease(id, body.triggeredByUserId, body.amountUsdc);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    if (error instanceof Error) {
      if (error.message === "MILESTONE_NOT_FOUND") return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
      if (error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "Release requester not found." }, { status: 404 });
      if (error.message === "MILESTONE_NOT_APPROVED") return NextResponse.json({ error: "Milestone must be approved before release." }, { status: 409 });
      if (error.message === "RELEASE_ALREADY_EXISTS") return NextResponse.json({ error: "A release already exists for this milestone." }, { status: 409 });
      if (error.message === "DESTINATION_WALLET_MISSING") return NextResponse.json({ error: "Destination wallet is missing." }, { status: 400 });
      if (error.message === "RELEASE_AMOUNT_MISMATCH") return NextResponse.json({ error: "Release amount must match the milestone amount." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to queue release." }, { status: 500 });
  }
}
