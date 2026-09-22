import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";

import { consumeWalletChallenge } from "@/lib/auth/wallet-challenge";
import { getSessionFromRequest, getVerifiedSessionUser } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const user = await getVerifiedSessionUser(session);
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const wallets = await db.userWallet.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      address: true,
      kind: true,
      authEnabled: true,
      transactionEnabled: true,
      verifiedAt: true,
      circleWallet: { select: { blockchain: true, accountType: true } },
    },
  });
  return NextResponse.json({ wallets });
}

/** Links an EOA only after both the current SettleFlow session and a fresh
 * signature from that exact EOA have been verified. */
export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    const user = await getVerifiedSessionUser(session);
    if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

    const body = (await request.json()) as { address?: string; nonce?: string; message?: string; signature?: string };
    if (!body.address || !isAddress(body.address) || !body.nonce || !body.message || !body.signature) {
      return NextResponse.json({ error: "Wallet address, nonce, message, and signature are required." }, { status: 400 });
    }
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    if (!await consumeWalletChallenge(body.address, new URL(origin).host, body.nonce, body.message, body.signature)) {
      return NextResponse.json({ error: "Invalid or expired wallet signature." }, { status: 401 });
    }

    const address = getAddress(body.address);
    const normalizedAddress = address.toLowerCase();
    const linked = await db.$transaction(async (tx) => {
      const existing = await tx.userWallet.findUnique({ where: { normalizedAddress } });
      // Linking is an account-creation boundary. An address that has ever
      // been registered is never re-assigned or merged, including when the
      // caller already owns it.
      if (existing) throw new Error("WALLET_ALREADY_LINKED");

      return tx.userWallet.create({
        data: {
          userId: user.id,
          address,
          normalizedAddress,
          kind: "web3_eoa",
          authEnabled: true,
          transactionEnabled: true,
        },
      });
    });
    return NextResponse.json({ wallet: { id: linked.id, address: linked.address, kind: linked.kind } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "WALLET_ALREADY_LINKED") {
      return NextResponse.json({ error: "WALLET_ALREADY_LINKED" }, { status: 409 });
    }
    return NextResponse.json({ error: "WALLET_LINK_FAILED" }, { status: 500 });
  }
}
