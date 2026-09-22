import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";

import { getSessionFromRequest, getVerifiedSessionUser } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";
import { CIRCLE_SMART_WALLET_AVAILABLE, circleSmartWalletComingSoonResponse } from "@/lib/circle/availability";
import {
  CircleApiError,
  CircleConfigurationError,
  assertArcSmartWallet,
  createCircleUserSession,
  getCircleChallenge,
  getCircleWallet,
} from "@/lib/circle/user-controlled";

export async function POST(request: Request) {
  if (!CIRCLE_SMART_WALLET_AVAILABLE) {
    return NextResponse.json(circleSmartWalletComingSoonResponse(), { status: 503 });
  }
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (session.authType !== "web2_google") {
    return NextResponse.json({ error: "CIRCLE_WALLET_REQUIRES_GOOGLE_SESSION" }, { status: 403 });
  }
  const user = await getVerifiedSessionUser(session);
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  try {
    const provisioning = await db.circleWalletProvisioning.findUnique({ where: { userId: user.id } });
    if (!provisioning?.challengeId) {
      return NextResponse.json({ error: "CIRCLE_WALLET_PROVISIONING_NOT_FOUND" }, { status: 409 });
    }
    const circleSession = await createCircleUserSession(user.id);
    const challenge = await getCircleChallenge(circleSession.userToken, provisioning.challengeId);
    if (challenge.status !== "COMPLETE" || !challenge.correlationIds?.[0]) {
      return NextResponse.json({ error: "CIRCLE_WALLET_CHALLENGE_NOT_COMPLETE", status: challenge.status }, { status: 409 });
    }
    const circleWallet = await getCircleWallet(circleSession.userToken, challenge.correlationIds[0]);
    assertArcSmartWallet(circleWallet);
    if (!isAddress(circleWallet.address)) throw new Error("CIRCLE_WALLET_INVALID_ADDRESS");
    const address = getAddress(circleWallet.address);
    const normalizedAddress = address.toLowerCase();
    const wallet = await db.$transaction(async (tx) => {
      const walletLink = await tx.userWallet.upsert({
        where: { normalizedAddress },
        create: {
          userId: user.id,
          address,
          normalizedAddress,
          kind: "circle_sca",
          transactionEnabled: true,
        },
        update: {},
        select: { id: true, userId: true, kind: true },
      });
      if (walletLink.userId !== user.id || walletLink.kind !== "circle_sca") {
        throw new Error("CIRCLE_WALLET_ADDRESS_ALREADY_LINKED");
      }
      return tx.circleUserWallet.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          walletId: circleWallet.id,
          address,
          blockchain: circleWallet.blockchain,
          accountType: circleWallet.accountType,
          scaCore: circleWallet.scaCore,
          walletLinkId: walletLink.id,
        },
        update: {
          walletId: circleWallet.id,
          address,
          blockchain: circleWallet.blockchain,
          accountType: circleWallet.accountType,
          scaCore: circleWallet.scaCore,
          walletLinkId: walletLink.id,
        },
        select: { walletId: true, address: true, blockchain: true, accountType: true, scaCore: true },
      });
    });
    await db.circleWalletProvisioning.delete({ where: { userId: user.id } });
    return NextResponse.json({ wallet });
  } catch (error) {
    if (error instanceof CircleConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof CircleApiError) return NextResponse.json({ error: "CIRCLE_WALLET_PROVIDER_ERROR" }, { status: 502 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "CIRCLE_WALLET_ERROR" }, { status: 500 });
  }
}
