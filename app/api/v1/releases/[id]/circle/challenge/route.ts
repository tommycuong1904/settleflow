import { NextResponse } from "next/server";

import { ARC_CONFIG } from "@/lib/arc/config";
import { createCircleTransferChallenge, createCircleUserSession, getCircleUserControlledConfig } from "@/lib/circle/user-controlled";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";
import { claimReleaseExecution } from "@/lib/repositories/release-proof";
import { assertCanReleaseMilestone } from "@/lib/runtime/product-policy";
import { CIRCLE_SMART_WALLET_AVAILABLE, circleSmartWalletComingSoonResponse } from "@/lib/circle/availability";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!CIRCLE_SMART_WALLET_AVAILABLE) {
    return NextResponse.json(circleSmartWalletComingSoonResponse(), { status: 503 });
  }
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (session.authType !== "web2_google") {
    return NextResponse.json({ error: "CIRCLE_WALLET_REQUIRES_GOOGLE_SESSION" }, { status: 403 });
  }
  const context = await resolveProductContextFromRequestWithSession(request);
  const violation = assertCanReleaseMilestone({ productContext: context, actorUserId: context.activeUserId });
  if (violation) return NextResponse.json({ error: violation.message }, { status: violation.status });
  if (session.userId !== context.ownerUserId) return NextResponse.json({ error: "CIRCLE_WALLET_OWNER_MISMATCH" }, { status: 403 });

  try {
    const release = await db.release.findFirst({
      where: { id, payout: { workspaceId: context.workspaceId }, triggeredByUserId: context.ownerUserId },
      select: {
        id: true, status: true, executionMode: true, circleChallengeId: true,
        amountUsdc: true, destinationWalletAddress: true, sourceWalletAddress: true,
      },
    });
    if (!release) return NextResponse.json({ error: "RELEASE_NOT_FOUND" }, { status: 404 });
    if (release.executionMode !== "circle_user_wallet") {
      return NextResponse.json({ error: "RELEASE_EXECUTION_MODE_MISMATCH" }, { status: 409 });
    }
    if (release.status !== "queued" && release.status !== "pending") {
      return NextResponse.json({ error: "RELEASE_NOT_REFRESHABLE" }, { status: 409 });
    }
    const wallet = await db.circleUserWallet.findUnique({ where: { userId: context.ownerUserId } });
    if (!wallet || wallet.address.toLowerCase() !== release.sourceWalletAddress?.toLowerCase()) {
      return NextResponse.json({ error: "CIRCLE_WALLET_SOURCE_MISMATCH" }, { status: 409 });
    }

    const circleSession = await createCircleUserSession(context.ownerUserId);
    const config = getCircleUserControlledConfig();
    let challengeId = release.circleChallengeId;
    if (challengeId && release.status === "queued") {
      await claimReleaseExecution(release.id, context.workspaceId);
    }
    if (!challengeId) {
      challengeId = await createCircleTransferChallenge({
        userToken: circleSession.userToken,
        walletId: wallet.walletId,
        destinationAddress: release.destinationWalletAddress,
        amount: release.amountUsdc.toString(),
        tokenAddress: ARC_CONFIG.usdcAddress,
        idempotencyKey: release.id,
      });
      const bound = await db.release.updateMany({
        where: { id: release.id, status: "queued", circleChallengeId: null },
        data: { circleChallengeId: challengeId },
      });
      if (bound.count === 1) await claimReleaseExecution(release.id, context.workspaceId);
      else {
        const current = await db.release.findUnique({ where: { id: release.id }, select: { circleChallengeId: true, status: true } });
        if (!current?.circleChallengeId || current.status !== "pending") {
          return NextResponse.json({ error: "RELEASE_ALREADY_CLAIMED" }, { status: 409 });
        }
        challengeId = current.circleChallengeId;
      }
    }
    return NextResponse.json({ challenge: { id: challengeId, appId: config.appId, ...circleSession } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CIRCLE_WALLET_ERROR";
    const status = message === "CIRCLE_USER_CONTROLLED_NOT_CONFIGURED" ? 503 : 502;
    return NextResponse.json({ error: message === "CIRCLE_USER_CONTROLLED_NOT_CONFIGURED" ? message : "CIRCLE_WALLET_PROVIDER_ERROR" }, { status });
  }
}
