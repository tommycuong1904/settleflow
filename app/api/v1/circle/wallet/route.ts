import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";

import { getSessionFromRequest, getVerifiedSessionUser } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";
import {
  CircleApiError,
  CircleConfigurationError,
  type CircleWallet,
  assertArcSmartWallet,
  createCircleUserSession,
  createCircleWalletInitializationChallenge,
  getCircleChallenge,
  getCircleUserControlledConfig,
  getCircleWallet,
  isCircleUserControlledConfigured,
  listCircleWallets,
  selectArcSmartWallet,
} from "@/lib/circle/user-controlled";
import { randomUUID } from "node:crypto";

type GoogleSessionUser = { id: string };

async function requireGoogleUser(request: Request): Promise<GoogleSessionUser | NextResponse> {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (session.authType !== "web2_google") {
    return NextResponse.json({ error: "CIRCLE_WALLET_REQUIRES_GOOGLE_SESSION" }, { status: 403 });
  }
  const user = await getVerifiedSessionUser(session);
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  return { id: user.id };
}

function circleErrorResponse(error: unknown) {
  if (error instanceof CircleConfigurationError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof CircleApiError) {
    return NextResponse.json({ error: "CIRCLE_WALLET_PROVIDER_ERROR" }, { status: 502 });
  }
  return NextResponse.json({ error: error instanceof Error ? error.message : "CIRCLE_WALLET_ERROR" }, { status: 500 });
}

async function persistWallet(userId: string, wallet: CircleWallet) {
  assertArcSmartWallet(wallet);
  if (!isAddress(wallet.address)) throw new Error("CIRCLE_WALLET_INVALID_ADDRESS");
  const address = getAddress(wallet.address);
  const normalizedAddress = address.toLowerCase();

  return db.$transaction(async (tx) => {
    const walletLink = await tx.userWallet.upsert({
      where: { normalizedAddress },
      create: {
        userId,
        address,
        normalizedAddress,
        kind: "circle_sca",
        transactionEnabled: true,
      },
      update: {},
      select: { id: true, userId: true, kind: true },
    });
    if (walletLink.userId !== userId || walletLink.kind !== "circle_sca") {
      throw new Error("CIRCLE_WALLET_ADDRESS_ALREADY_LINKED");
    }

    return tx.circleUserWallet.upsert({
      where: { userId },
      create: {
        userId,
        walletId: wallet.id,
        address,
        blockchain: wallet.blockchain,
        accountType: wallet.accountType,
        scaCore: wallet.scaCore,
        walletLinkId: walletLink.id,
      },
      update: {
        walletId: wallet.id,
        address,
        blockchain: wallet.blockchain,
        accountType: wallet.accountType,
        scaCore: wallet.scaCore,
        walletLinkId: walletLink.id,
      },
      select: { walletId: true, address: true, blockchain: true, accountType: true, scaCore: true },
    });
  });
}

export async function GET(request: Request) {
  const user = await requireGoogleUser(request);
  if (user instanceof NextResponse) return user;
  const wallet = await db.circleUserWallet.findUnique({
    where: { userId: user.id },
    select: { walletId: true, address: true, blockchain: true, accountType: true, scaCore: true },
  });
  return NextResponse.json({ configured: isCircleUserControlledConfigured(), wallet });
}

/**
 * Creates or resumes the single persisted Circle initialization challenge.
 * The response contains only a short-lived Circle user token and encryption
 * key for the Web SDK; no API key or private key ever reaches the client.
 */
export async function POST(request: Request) {
  const user = await requireGoogleUser(request);
  if (user instanceof NextResponse) return user;

  try {
    const existingWallet = await db.circleUserWallet.findUnique({
      where: { userId: user.id },
      select: { walletId: true, address: true, blockchain: true, accountType: true, scaCore: true },
    });
    if (existingWallet) return NextResponse.json({ wallet: existingWallet, challenge: null });

    const session = await createCircleUserSession(user.id);
    const config = getCircleUserControlledConfig();
    let provisioning = await db.circleWalletProvisioning.findUnique({ where: { userId: user.id } });

    // A wallet may already have been created in Circle if the database write
    // was interrupted after a completed challenge. Reuse it rather than create
    // another address.
    const alreadyCreated = selectArcSmartWallet(await listCircleWallets(session.userToken));
    if (alreadyCreated) {
      const wallet = await persistWallet(user.id, alreadyCreated);
      await db.circleWalletProvisioning.deleteMany({ where: { userId: user.id } });
      return NextResponse.json({ wallet, challenge: null });
    }

    if (provisioning?.challengeId) {
      const challenge = await getCircleChallenge(session.userToken, provisioning.challengeId);
      if (challenge.status === "COMPLETE" && challenge.correlationIds?.[0]) {
        const wallet = await persistWallet(user.id, await getCircleWallet(session.userToken, challenge.correlationIds[0]));
        await db.circleWalletProvisioning.deleteMany({ where: { userId: user.id } });
        return NextResponse.json({ wallet, challenge: null });
      }
      if (challenge.status === "PENDING" || challenge.status === "IN_PROGRESS") {
        return NextResponse.json({
          wallet: null,
          challenge: { id: provisioning.challengeId, appId: config.appId, ...session },
        });
      }
      provisioning = await db.circleWalletProvisioning.update({
        where: { userId: user.id },
        data: { idempotencyKey: randomUUID(), challengeId: null, status: challenge.status.toLowerCase() },
      });
    }

    if (!provisioning) {
      provisioning = await db.circleWalletProvisioning.create({
        data: { userId: user.id, idempotencyKey: randomUUID() },
      });
    }
    const challengeId = await createCircleWalletInitializationChallenge(session.userToken, provisioning.idempotencyKey);
    await db.circleWalletProvisioning.update({
      where: { userId: user.id },
      data: { challengeId, status: "pending" },
    });
    return NextResponse.json({
      wallet: null,
      challenge: { id: challengeId, appId: config.appId, ...session },
    });
  } catch (error) {
    return circleErrorResponse(error);
  }
}
