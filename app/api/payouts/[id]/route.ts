import { NextResponse } from "next/server";
import { getPayoutById } from "@/lib/repositories/payouts";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const payout = await getPayoutById(id, searchParams.get("workspaceId") ?? undefined);

  if (!payout) {
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }

  return NextResponse.json({ data: payout });
}
