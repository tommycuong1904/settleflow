import { NextResponse } from "next/server";
import { getPayoutDetail } from "@/lib/repositories/payouts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getPayoutDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  }

  return NextResponse.json({ data: detail });
}
