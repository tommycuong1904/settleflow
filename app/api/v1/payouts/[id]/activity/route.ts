import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getPayoutActivity } from "@/lib/repositories/payout-activity";
import { getPayoutDetail } from "@/lib/repositories/payouts";
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
    const detail = await getPayoutDetail(id, productContext.workspaceId);

    if (!detail) {
      return apiError("PAYOUT_NOT_FOUND", { message: "Payout not found.", status: 404 });
    }

    const activity = await getPayoutActivity(id);
    if (activity.length === 0) {
      return apiError("PAYOUT_ACTIVITY_NOT_FOUND", { message: "Payout activity not found.", status: 404 });
    }
    return NextResponse.json({ data: activity });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_CONTEXT_REQUIRED") {
      return apiError("AUTH_CONTEXT_REQUIRED", { status: 403 });
    }
    return apiError("PAYOUT_ACTIVITY_LOAD_FAILED", { message: "Failed to load payout activity.", status: 500 });
  }
}
