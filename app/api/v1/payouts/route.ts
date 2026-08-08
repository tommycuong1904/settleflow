import { NextResponse } from "next/server";
import { createPayout } from "@/lib/repositories/payout-creation";

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const milestones = Array.isArray(body.milestones) ? body.milestones : [];
    const required = [body.workspaceId, body.createdByUserId, body.title, body.contributorId,
      body.targetWalletAddress, body.totalAmountUsdc];

    if (required.some((value) => !isNonEmpty(value)) || milestones.length === 0) {
      return NextResponse.json({ error: "Invalid payout payload." }, { status: 400 });
    }

    if (body.currency && body.currency !== "USDC") {
      return NextResponse.json({ error: "Only USDC is supported." }, { status: 400 });
    }

    const milestonePayload = milestones as Array<{
      title: unknown;
      description: unknown;
      amountUsdc: unknown;
      sequence: unknown;
    }>;

    if (milestonePayload.some((milestone) =>
      !isNonEmpty(milestone.title) || !isNonEmpty(milestone.description) ||
      !isNonEmpty(milestone.amountUsdc) || !Number.isInteger(milestone.sequence))) {
      return NextResponse.json({ error: "Invalid milestone payload." }, { status: 400 });
    }

    const payout = await createPayout({ ...body, currency: "USDC", milestones });
    return NextResponse.json({ payout }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "USER_NOT_ALLOWED_TO_CREATE_PAYOUT") {
      return NextResponse.json({ error: "User is not allowed to create payouts in this workspace." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "CONTRIBUTOR_NOT_FOUND") {
      return NextResponse.json({ error: "Contributor not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to create payout." }, { status: 500 });
  }
}

export { GET } from "@/app/api/payouts/route";
