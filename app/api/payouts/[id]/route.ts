import { NextResponse } from "next/server";
import { getPayoutDetail } from "@/lib/repositories/payouts";
import { resolveWorkspaceIdFromRequest } from "@/lib/runtime/product-context-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getPayoutDetail(id, resolveWorkspaceIdFromRequest(request));

  if (!detail) {
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }

  return NextResponse.json({ data: detail });
}
