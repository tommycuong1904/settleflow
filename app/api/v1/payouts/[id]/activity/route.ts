import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getPayoutActivity } from "@/lib/repositories/payout-activity";
import { getPayoutDetail } from "@/lib/repositories/payouts";
import { assertCanViewPayout } from "@/lib/runtime/product-policy";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }
  const { id } = await params;
  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    const scope = productContext.actor === "contributor"
        ? { linkedUserId: productContext.activeUserId }
        : undefined;
    const detail = await getPayoutDetail(id, productContext.workspaceId, scope);

    if (!detail) {
      return apiError("PAYOUT_NOT_FOUND", { message: "Payout not found.", status: 404 });
    }

    const viewViolation = assertCanViewPayout({
      productContext,
      linkedContributorUserId: detail.contributor?.linkedUserId ?? null,
    });

    if (viewViolation) {
      return apiError(viewViolation.code, {
        message: viewViolation.message,
        status: viewViolation.status,
      });
    }

    const activity = await getPayoutActivity(
      id,
      productContext.workspaceId,
      scope,
      productContext.actor,
    );
    if (activity.length === 0) {
      return apiError("PAYOUT_ACTIVITY_NOT_FOUND", { message: "Payout activity not found.", status: 404 });
    }
    return NextResponse.json({ data: activity });
  } catch (error) {
    if (error instanceof Error && (error.message === "AUTH_CONTEXT_REQUIRED" || error.message === "AUTH_ROLE_AMBIGUOUS")) {
      return apiError(error.message, { status: 403 });
    }
    return apiError("PAYOUT_ACTIVITY_LOAD_FAILED", { message: "Failed to load payout activity.", status: 500 });
  }
}
