import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { createPayout } from "@/lib/repositories/payout-creation";
import { resolveProductContext } from "@/lib/runtime/product-context-server";

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const milestones = Array.isArray(body.milestones) ? body.milestones : [];
    const productContext = resolveProductContext(body ?? {});
    const required = [productContext.workspaceId, productContext.ownerUserId, body.title, body.contributorId,
      body.targetWalletAddress, body.totalAmountUsdc];

    if (required.some((value) => !isNonEmpty(value)) || milestones.length === 0) {
      return apiError("INVALID_PAYOUT_PAYLOAD", { message: "Invalid payout payload.", status: 400 });
    }

    if (body.currency && body.currency !== "USDC") {
      return apiError("UNSUPPORTED_PAYOUT_CURRENCY", { message: "Only USDC is supported.", status: 400 });
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
      return apiError("INVALID_MILESTONE_PAYLOAD", { message: "Invalid milestone payload.", status: 400 });
    }

    const payout = await createPayout({
      ...body,
      workspaceId: productContext.workspaceId,
      createdByUserId: body.createdByUserId ?? body.triggeredByUserId ?? productContext.ownerUserId,
      currency: "USDC",
      milestones,
    });
    return NextResponse.json({ payout }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });
    }

    const code = error instanceof Error ? error.message : "UNABLE_TO_CREATE_PAYOUT";
    return apiErrorFromCode(
      code,
      {
        USER_NOT_FOUND: 404,
        USER_NOT_ALLOWED_TO_CREATE_PAYOUT: 403,
        CONTRIBUTOR_NOT_FOUND: 404,
      },
      {
        USER_NOT_FOUND: "Creator not found.",
        USER_NOT_ALLOWED_TO_CREATE_PAYOUT: "User is not allowed to create payouts in this workspace.",
        CONTRIBUTOR_NOT_FOUND: "Contributor not found.",
      },
      { message: "Unable to create payout.", status: 500 },
    );
  }
}

export { GET } from "@/app/api/payouts/route";
