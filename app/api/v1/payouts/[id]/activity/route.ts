import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getPayoutActivity } from "@/lib/repositories/payout-activity";
import { getPayoutDetail } from "@/lib/repositories/payouts";
import { resolveProductContextFromRequest } from "@/lib/runtime/product-context-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const productContext = resolveProductContextFromRequest(request);
  const detail = await getPayoutDetail(id, productContext.workspaceId);

  if (!detail) {
    return apiError("PAYOUT_NOT_FOUND", { message: "Payout not found.", status: 404 });
  }

  const activity = await getPayoutActivity(id);
  if (activity.length === 0) {
    return apiError("PAYOUT_ACTIVITY_NOT_FOUND", { message: "Payout activity not found.", status: 404 });
  }
  return NextResponse.json({ data: activity });
}
