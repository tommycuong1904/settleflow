import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAddress } from "viem";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Establishes a server-side session for a connected Web3 browser wallet.
 * The client already owns the address; the session cookie lets the proxy gate
 * confirm an authenticated session on subsequent mutation requests.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      address?: string;
      walletName?: string;
    };

    const address = body.address?.trim();
    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: "A valid EVM wallet address is required." },
        { status: 400 },
      );
    }

    const sessionToken = await createSessionToken({
      userId: address.toLowerCase(),
      email: `${address.toLowerCase()}@wallet.settleflow.io`,
      name: body.walletName || "Web3 Wallet",
      address,
      authType: "web3_wallet",
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      ...SESSION_COOKIE_OPTIONS,
      name: SESSION_COOKIE_NAME,
    });

    return NextResponse.json({
      success: true,
      user: {
        address,
        walletName: body.walletName || "Web3 Wallet",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to establish wallet session." },
      { status: 500 },
    );
  }
}