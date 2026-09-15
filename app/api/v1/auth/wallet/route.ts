import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAddress, isAddress } from "viem";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { consumeWalletChallenge } from "@/lib/auth/wallet-challenge";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string; walletName?: string; nonce?: string; message?: string; signature?: string };
    if (!body.address || !isAddress(body.address) || !body.nonce || !body.message || !body.signature) {
      return NextResponse.json({ error: "Wallet address, nonce, message, and signature are required." }, { status: 400 });
    }
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const valid = await consumeWalletChallenge(body.address, new URL(origin).host, body.nonce, body.message, body.signature);
    if (!valid) return NextResponse.json({ error: "Invalid or expired wallet signature." }, { status: 401 });
    const address = getAddress(body.address);
    const normalizedAddress = address.toLowerCase();
    const user = await db.user.findFirst({
      where: { walletAddress: { equals: normalizedAddress, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Wallet account is not provisioned." }, { status: 403 });
    }
    const membership = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { userId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Wallet account is not a workspace member." }, { status: 403 });
    }
    const sessionToken = await createSessionToken({ userId: user.id, email: `${normalizedAddress}@wallet.settleflow.io`, name: body.walletName || "Web3 Wallet", address, authType: "web3_wallet" });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, { ...SESSION_COOKIE_OPTIONS, name: SESSION_COOKIE_NAME });
    return NextResponse.json({ success: true, user: { address, walletName: body.walletName || "Web3 Wallet" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to establish wallet session." }, { status: 500 });
  }
}
