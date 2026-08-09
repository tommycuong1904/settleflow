import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import {
  isValidEnumQueryValue,
  parseEnumQueryValue,
  payoutStatuses,
} from "@/lib/api/list-query";
import { listPayouts } from "@/lib/repositories/payouts";
import { resolveWorkspaceIdFromRequest } from "@/lib/runtime/product-context-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (!isValidEnumQueryValue(status, payoutStatuses)) {
    return apiError("INVALID_PAYOUT_STATUS", { message: "Invalid payout status.", status: 400 });
  }

  const payouts = await listPayouts({
    workspaceId: resolveWorkspaceIdFromRequest(request),
    contributorId: searchParams.get("contributorId") ?? undefined,
    status: parseEnumQueryValue(status, payoutStatuses),
  });

  return NextResponse.json({ data: payouts });
}
