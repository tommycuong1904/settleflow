import { NextResponse } from "next/server";

import { CIRCLE_ARC_TESTNET, createCircleUserSession, getCircleChallenge, getCircleTransaction } from "@/lib/circle/user-controlled";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";
import { markReleaseReconciliationPending, recordReleaseTransactionHash, refreshReleaseProof } from "@/lib/repositories/release-proof";
import { assertCanReleaseMilestone } from "@/lib/runtime/product-policy";
import { Decimal } from "@prisma/client/runtime/library";

async function circleReleaseSnapshot(releaseId: string, workspaceId: string) {
  const release = await db.release.findFirst({
    where: { id: releaseId, payout: { workspaceId } },
    select: {
      id: true,
      status: true,
      executionMode: true,
      txHash: true,
      arcRequestId: true,
      proofs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          releaseId: true,
          milestoneId: true,
          status: true,
          txHash: true,
          network: true,
          explorerUrl: true,
          confirmedAt: true,
          failedAt: true,
          failureReason: true,
        },
      },
    },
  });
  if (!release) throw new Error("RELEASE_NOT_FOUND");
  const proof = release.proofs[0];
  return {
    status: proof?.status ?? release.status,
    release: { id: release.id, status: release.status, txHash: release.txHash ?? undefined, arcRequestId: release.arcRequestId ?? undefined },
    proof: proof
      ? {
          id: proof.id,
          releaseId: proof.releaseId ?? undefined,
          milestoneId: proof.milestoneId ?? undefined,
          status: proof.status,
          txHash: proof.txHash ?? undefined,
          network: proof.network ?? undefined,
          explorerUrl: proof.explorerUrl ?? undefined,
          confirmedAt: proof.confirmedAt?.toISOString(),
          failedAt: proof.failedAt?.toISOString(),
          failureReason: proof.failureReason ?? undefined,
          executionMode: release.executionMode,
          releaseTxHash: release.txHash ?? undefined,
          releaseArcRequestId: release.arcRequestId ?? undefined,
        }
      : undefined,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (session.authType !== "web2_google") return NextResponse.json({ error: "CIRCLE_WALLET_REQUIRES_GOOGLE_SESSION" }, { status: 403 });
  const context = await resolveProductContextFromRequestWithSession(request);
  const violation = assertCanReleaseMilestone({ productContext: context, actorUserId: context.activeUserId });
  if (violation) return NextResponse.json({ error: violation.message }, { status: violation.status });
  if (session.userId !== context.ownerUserId) return NextResponse.json({ error: "CIRCLE_WALLET_OWNER_MISMATCH" }, { status: 403 });

  try {
    const release = await db.release.findFirst({
      where: { id, payout: { workspaceId: context.workspaceId }, triggeredByUserId: context.ownerUserId },
      select: {
        id: true, status: true, executionMode: true, circleChallengeId: true, arcRequestId: true,
        amountUsdc: true, destinationWalletAddress: true, sourceWalletAddress: true,
      },
    });
    if (!release) return NextResponse.json({ error: "RELEASE_NOT_FOUND" }, { status: 404 });
    if (release.executionMode !== "circle_user_wallet") {
      return NextResponse.json({ error: "RELEASE_EXECUTION_MODE_MISMATCH" }, { status: 409 });
    }
    if (release.status === "confirmed" || release.status === "failed") {
      return NextResponse.json(await circleReleaseSnapshot(release.id, context.workspaceId));
    }
    if (release.status !== "pending") {
      return NextResponse.json({ error: "RELEASE_NOT_REFRESHABLE" }, { status: 409 });
    }
    // A retry creates a fresh pending release without a Circle challenge. Tell
    // the client to create that first confirmation rather than treating the
    // absence as a provider failure.
    if (!release.circleChallengeId) {
      return NextResponse.json(
        { ...(await circleReleaseSnapshot(release.id, context.workspaceId)), phase: "confirmation" },
        { status: 202 },
      );
    }
    const wallet = await db.circleUserWallet.findUnique({ where: { userId: context.ownerUserId } });
    if (!wallet || wallet.address.toLowerCase() !== release.sourceWalletAddress?.toLowerCase()) {
      return NextResponse.json({ error: "CIRCLE_WALLET_SOURCE_MISMATCH" }, { status: 409 });
    }
    const circleSession = await createCircleUserSession(context.ownerUserId);
    const challenge = await getCircleChallenge(circleSession.userToken, release.circleChallengeId);
    if (challenge.status === "PENDING" || challenge.status === "IN_PROGRESS") {
      return NextResponse.json(
        { ...(await circleReleaseSnapshot(release.id, context.workspaceId)), phase: "confirmation" },
        { status: 202 },
      );
    }
    if (challenge.status !== "COMPLETE" || !challenge.correlationIds?.[0]) {
      const failed = await refreshReleaseProof(
        release.id,
        context.ownerUserId,
        context.workspaceId,
        { status: "failed", failureReason: challenge.errorMessage ?? "Circle wallet confirmation was not completed." },
        { trustedCircleUserWalletExecution: true },
      );
      return NextResponse.json(await circleReleaseSnapshot(failed.release.id, context.workspaceId));
    }

    const transaction = await getCircleTransaction(circleSession.userToken, challenge.correlationIds[0]);
    if (
      transaction.blockchain !== CIRCLE_ARC_TESTNET ||
      transaction.sourceAddress?.toLowerCase() !== wallet.address.toLowerCase() ||
      transaction.destinationAddress?.toLowerCase() !== release.destinationWalletAddress.toLowerCase() ||
      !transaction.amounts?.[0] ||
      !new Decimal(transaction.amounts[0]).equals(release.amountUsdc)
    ) {
      return NextResponse.json({ error: "CIRCLE_TRANSACTION_SNAPSHOT_MISMATCH" }, { status: 409 });
    }
    await db.release.updateMany({
      where: { id: release.id, status: "pending", arcRequestId: null },
      data: { arcRequestId: transaction.id },
    });
    if (transaction.state === "COMPLETE" || transaction.state === "CONFIRMED") {
      if (!transaction.txHash) {
        return NextResponse.json(
          { ...(await circleReleaseSnapshot(release.id, context.workspaceId)), phase: "settlement" },
          { status: 202 },
        );
      }
      await recordReleaseTransactionHash(release.id, context.workspaceId, transaction.txHash);
      await refreshReleaseProof(release.id, context.ownerUserId, context.workspaceId, {
        status: "confirmed", txHash: transaction.txHash, network: "Arc Testnet",
      });
      return NextResponse.json(await circleReleaseSnapshot(release.id, context.workspaceId));
    }
    if (transaction.state === "FAILED" || transaction.state === "CANCELLED") {
      const failed = await refreshReleaseProof(
        release.id,
        context.ownerUserId,
        context.workspaceId,
        { status: "failed", failureReason: transaction.errorReason ?? "Circle wallet transfer failed." },
        { trustedCircleUserWalletExecution: true },
      );
      return NextResponse.json(await circleReleaseSnapshot(failed.release.id, context.workspaceId));
    }
    await markReleaseReconciliationPending(release.id, context.workspaceId, {
      network: "Arc Testnet",
      reason: "Circle wallet transfer is pending confirmation.",
    });
    return NextResponse.json(
      { ...(await circleReleaseSnapshot(release.id, context.workspaceId)), phase: "settlement" },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "CIRCLE_WALLET_ERROR";
    return NextResponse.json({ error: message === "CIRCLE_USER_CONTROLLED_NOT_CONFIGURED" ? message : "CIRCLE_WALLET_PROVIDER_ERROR" }, { status: message === "CIRCLE_USER_CONTROLLED_NOT_CONFIGURED" ? 503 : 502 });
  }
}
