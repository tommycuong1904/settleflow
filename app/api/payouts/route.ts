import { NextResponse } from "next/server";
import { listPayouts } from "@/lib/repositories/payouts";
import { resolveWorkspaceIdFromRequest } from "@/lib/runtime/product-context-server";

const payoutStatuses = ["draft", "active", "partially_released", "completed"] as const;

type PayoutStatus = (typeof payoutStatuses)[number];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status && !payoutStatuses.includes(status as PayoutStatus)) {
    return NextResponse.json({ error: "Invalid payout status." }, { status: 400 });
  }

  const payouts = await listPayouts({
    workspaceId: resolveWorkspaceIdFromRequest(request),
    contributorId: searchParams.get("contributorId") ?? undefined,
    status: status as PayoutStatus | undefined,
  });

  return NextResponse.json({ data: payouts });
}
