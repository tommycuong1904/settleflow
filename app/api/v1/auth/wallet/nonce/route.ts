import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { createWalletChallenge } from "@/lib/auth/wallet-challenge";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string };
    if (!body.address || !isAddress(body.address)) return NextResponse.json({ error: "Valid wallet address required." }, { status: 400 });
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    return NextResponse.json(await createWalletChallenge(body.address, new URL(origin).host));
  } catch (error) {
    console.error("Wallet sign-in challenge creation failed:", error);
    return NextResponse.json(
      { error: "Wallet sign-in is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
