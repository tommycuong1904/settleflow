import { Decimal } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ARC_CONFIG } from "@/lib/arc/config";
import { sendUsdcOnArc } from "@/lib/arc/send";
import { db } from "@/lib/db/client";
import {
  getLegacyReleaseErrorStatus,
  hasRequiredLegacyReleaseFields,
  type ReleaseRequestBody,
} from "@/lib/api/legacy-release";
import { resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { assertCanReleaseMilestone } from "@/lib/runtime/product-policy";


export async function POST(request: Request) {
  let productContext;
  try {
    productContext = await resolveProductContextFromRequestWithSession(request);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_CONTEXT_REQUIRED") {
      return NextResponse.json({ error: "Authorized workspace membership required.", code: "AUTH_CONTEXT_REQUIRED" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to resolve authorization context." }, { status: 500 });
  }
  const workspaceId = productContext.workspaceId;
  const permissionViolation = assertCanReleaseMilestone({ productContext, actorUserId: productContext.activeUserId });
  if (permissionViolation) {
    return NextResponse.json({ error: permissionViolation.message, code: permissionViolation.code }, { status: permissionViolation.status });
  }
  let body: ReleaseRequestBody;

  try {
    body = (await request.json()) as ReleaseRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!hasRequiredLegacyReleaseFields(body)) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: payoutId, milestoneId, recipientAddress, amount",
      },
      { status: 400 },
    );
  }

  const { payoutId, milestoneId, recipientAddress, amount, executionMode } =
    body;

  // --- Step 2: Validate milestone state and create release + proof in DB ---
  let releaseResult: {
    release: {
      id: string;
      payoutId: string;
      milestoneId: string | null;
      status: string;
      amountUsdc: Decimal;
      executionMode: string;
      destinationWalletAddress: string;
    };
    proof: { id: string; status: string };
  };

  try {
    releaseResult = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const milestone = await tx.milestone.findUnique({
        where: { id: milestoneId },
        select: {
          id: true,
          status: true,
          amountUsdc: true,
          payout: { select: { id: true, workspaceId: true, targetWalletAddress: true } },
          releases: { select: { id: true }, take: 1 },
        },
      });

      if (!milestone) throw new Error("MILESTONE_NOT_FOUND");
      if (milestone.payout.workspaceId !== workspaceId)
        throw new Error("WORKSPACE_SCOPE_MISMATCH");
      if (milestone.payout.id !== payoutId)
        throw new Error("PAYOUT_MILESTONE_MISMATCH");
      if (milestone.status !== "approved")
        throw new Error("MILESTONE_NOT_APPROVED");
      if (milestone.releases.length > 0)
        throw new Error("RELEASE_ALREADY_EXISTS");
      if (!milestone.payout.targetWalletAddress)
        throw new Error("DESTINATION_WALLET_MISSING");
      if (
        recipientAddress.trim().toLowerCase() !==
        milestone.payout.targetWalletAddress.trim().toLowerCase()
      )
        throw new Error("RECIPIENT_ADDRESS_MISMATCH");

      const requestedAmount = new Decimal(amount);
      if (!requestedAmount.equals(milestone.amountUsdc))
        throw new Error("RELEASE_AMOUNT_MISMATCH");

      const rel = await tx.release.create({
        data: {
          payoutId: milestone.payout.id,
          milestoneId,
          triggeredByUserId: productContext.activeUserId,
          amountUsdc: requestedAmount,
          executionMode: executionMode ?? "browser_wallet",
          sourceWalletAddress: null,
          destinationWalletAddress: milestone.payout.targetWalletAddress,
          status: "queued",
        },
        select: {
          id: true,
          payoutId: true,
          milestoneId: true,
          status: true,
          amountUsdc: true,
          executionMode: true,
          destinationWalletAddress: true,
        },
      });

      const prf = await tx.transactionProof.create({
        data: {
          payoutId: milestone.payout.id,
          milestoneId,
          releaseId: rel.id,
          status: "pending",
        },
        select: { id: true, status: true },
      });

      return { release: rel, proof: prf };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: getLegacyReleaseErrorStatus(message) });
  }

  // --- Step 3: Execute the Arc transfer ---
  const sendResult = await sendUsdcOnArc({
    recipient: recipientAddress,
    amount,
    tokenAddress: ARC_CONFIG.usdcAddress,
    executionMode: executionMode ?? "browser_wallet",
    payoutId,
    milestoneId,
    releaseId: releaseResult.release.id,
  });

  // --- Step 4: Update release and proof with execution result ---
  const isFailed = sendResult.status === "failed";
  const isConfirmed = sendResult.status === "confirmed";

  const updatedRelease = await db.release.update({
    where: { id: releaseResult.release.id },
    data: {
      status: isFailed
        ? "failed"
        : isConfirmed
          ? "confirmed"
          : "pending",
      txHash: sendResult.txHash ?? null,
      explorerUrl: sendResult.explorerUrl ?? null,
      sourceWalletAddress: sendResult.sourceWalletAddress ?? null,
      failureReason: sendResult.errorMessage ?? null,
      executedAt: isConfirmed ? new Date() : null,
      failedAt: isFailed ? new Date() : null,
    },
    select: { id: true, status: true, txHash: true },
  });

  const updatedProof = await db.transactionProof.update({
    where: { id: releaseResult.proof.id },
    data: {
      status: isFailed ? "failed" : isConfirmed ? "confirmed" : "pending",
      txHash: sendResult.txHash ?? null,
      network: sendResult.network ?? null,
      explorerUrl: sendResult.explorerUrl ?? null,
      confirmedAt: isConfirmed ? new Date() : null,
      failedAt: isFailed ? new Date() : null,
    },
    select: {
      id: true,
      milestoneId: true,
      txHash: true,
      network: true,
      status: true,
      explorerUrl: true,
      confirmedAt: true,
    },
  });

  return NextResponse.json({
    release: updatedRelease,
    proof: updatedProof,
  });
}
