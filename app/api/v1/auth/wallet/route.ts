import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAddress, isAddress } from "viem";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { consumeWalletChallenge } from "@/lib/auth/wallet-challenge";
import { db } from "@/lib/db/client";
import { provisionWalletUser } from "@/lib/auth/wallet-provisioning";
import { ensureInitialWorkspaceForUser } from "@/lib/services/workspaces";
import { PRODUCT_CONTEXT_COOKIE_NAMES, PRODUCT_CONTEXT_COOKIE_OPTIONS } from "@/lib/runtime/product-context";

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
    const { user, initialWorkspace } = await db.$transaction(async (tx) => {
      const user = await provisionWalletUser(tx, address, body.walletName);
      const initialWorkspace = await ensureInitialWorkspaceForUser(tx, { userId: user.id, displayName: user.displayName });
      return { user, initialWorkspace };
    });
    const sessionToken = await createSessionToken({ userId: user.id, email: `${normalizedAddress}@wallet.settleflow.io`, name: body.walletName || "Web3 Wallet", address, authType: "web3_wallet" });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, { ...SESSION_COOKIE_OPTIONS, name: SESSION_COOKIE_NAME });
    // Always replace any prior account's workspace selection with the one the
    // server just verified for this wallet. Deleting it makes client requests
    // fall back to a legacy default workspace and can break the next reload.
    cookieStore.set(PRODUCT_CONTEXT_COOKIE_NAMES.workspaceId, initialWorkspace.workspaceId, PRODUCT_CONTEXT_COOKIE_OPTIONS);
    return NextResponse.json({ success: true, user: { address, walletName: body.walletName || "Web3 Wallet" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to establish wallet session." }, { status: 500 });
  }
}
