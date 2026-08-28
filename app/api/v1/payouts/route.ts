import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import {
  hasContiguousMilestoneSequences,
  hasValidMilestoneShape,
  isNonEmptyString,
  sumMilestoneAmounts,
} from "@/lib/api/payout-payload";
import { createPayout } from "@/lib/repositories/payout-creation";
import { assertCanCreatePayout } from "@/lib/runtime/product-policy";
import { resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";

export async function POST(request: Request) {
  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    const body = await request.json();
    const milestones = Array.isArray(body.milestones) ? body.milestones : [];
    const required = [productContext.workspaceId, productContext.ownerUserId, body.title, body.contributorId,
      body.targetWalletAddress, body.totalAmountUsdc];

    if (required.some((value) => !isNonEmptyString(value)) || milestones.length === 0) {
      return apiError("INVALID_PAYOUT_PAYLOAD", { message: "Invalid payout payload.", status: 400 });
    }

    if (body.currency && body.currency !== "USDC") {
      return apiError("UNSUPPORTED_PAYOUT_CURRENCY", { message: "Only USDC is supported.", status: 400 });
    }

    const ownerUserId = productContext.ownerUserId;
    const policyViolation = assertCanCreatePayout({ productContext, actorUserId: ownerUserId });
    if (policyViolation) {
      return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
    }

    const milestonePayload = milestones as Array<{
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

    const milestoneTotal = sumMilestoneAmounts(milestonePayload);

    if (!milestoneTotal.equals(sumMilestoneAmounts([{ amountUsdc: body.totalAmountUsdc }]))) {
      return apiError("PAYOUT_TOTAL_MISMATCH", { message: "totalAmountUsdc must equal the sum of milestone amounts.", status: 400 });
    }

    const payout = await createPayout({
      ...body,
      workspaceId: productContext.workspaceId,
      createdByUserId: ownerUserId,
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
        INVALID_MILESTONE_SEQUENCE: 400,
        PAYOUT_TOTAL_MISMATCH: 400,
      },
      {
        USER_NOT_FOUND: "Owner context user not found.",
        USER_NOT_ALLOWED_TO_CREATE_PAYOUT: "User is not allowed to create payouts in this workspace.",
        CONTRIBUTOR_NOT_FOUND: "Contributor not found.",
        INVALID_MILESTONE_SEQUENCE: "Milestone sequence must start at 1 and stay contiguous.",
        PAYOUT_TOTAL_MISMATCH: "totalAmountUsdc must equal the sum of milestone amounts.",
      },
      { message: "Unable to create payout.", status: 500 },
    );
  }
}

export { GET } from "@/app/api/payouts/route";
