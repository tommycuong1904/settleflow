import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getPayoutActivity } from "@/lib/repositories/payout-activity";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const activity = await getPayoutActivity(id);
  if (activity.length === 0) {
    return apiError("PAYOUT_ACTIVITY_NOT_FOUND", { message: "Payout activity not found.", status: 404 });
  }
  return NextResponse.json({ data: activity });
}
