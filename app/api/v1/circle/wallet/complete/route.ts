import { NextResponse } from "next/server";

import { getSessionFromRequest, getVerifiedSessionUser } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";
import {
  CircleApiError,
  CircleConfigurationError,
  assertArcSmartWallet,
  createCircleUserSession,
  getCircleChallenge,
  getCircleWallet,
} from "@/lib/circle/user-controlled";

export async function POST(request: Request) {
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
    const wallet = await db.circleUserWallet.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        walletId: circleWallet.id,
        address: circleWallet.address,
        blockchain: circleWallet.blockchain,
        accountType: circleWallet.accountType,
        scaCore: circleWallet.scaCore,
      },
      update: {
        walletId: circleWallet.id,
        address: circleWallet.address,
        blockchain: circleWallet.blockchain,
        accountType: circleWallet.accountType,
        scaCore: circleWallet.scaCore,
      },
      select: { walletId: true, address: true, blockchain: true, accountType: true, scaCore: true },
    });
    await db.circleWalletProvisioning.delete({ where: { userId: user.id } });
    return NextResponse.json({ wallet });
  } catch (error) {
    if (error instanceof CircleConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof CircleApiError) return NextResponse.json({ error: "CIRCLE_WALLET_PROVIDER_ERROR" }, { status: 502 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "CIRCLE_WALLET_ERROR" }, { status: 500 });
  }
}
