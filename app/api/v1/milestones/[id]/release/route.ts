import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { hasReleaseAmountPayload } from "@/lib/api/release-payload";
import { isValidUsdcAmount } from "@/lib/api/payout-payload";
import { ARC_CONFIG } from "@/lib/arc/config";
import { sendUsdcOnArc } from "@/lib/arc/send";
import { queueMilestoneRelease } from "@/lib/repositories/milestone-release";
import { claimReleaseExecution, markReleaseReconciliationPending, recordReleaseSourceWallet, recordReleaseTransactionHash, refreshReleaseProof } from "@/lib/repositories/release-proof";
import { assertCanReleaseMilestone } from "@/lib/runtime/product-policy";
import { resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";

function isReleaseExecutionMode(value: unknown): value is "browser_wallet" | "circle_wallet" {
  return value === "browser_wallet" || value === "circle_wallet";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    const body = await request.json();
    const ownerUserId = productContext.ownerUserId;
    if (!hasReleaseAmountPayload(body, ownerUserId) || !isValidUsdcAmount(body.amountUsdc)) {
      return apiError("INVALID_RELEASE_PAYLOAD", { message: "owner context and a valid amountUsdc are required.", status: 400 });
    }

    const policyViolation = assertCanReleaseMilestone({ productContext, actorUserId: ownerUserId });
    if (policyViolation) {
      return apiError(policyViolation.code, { message: policyViolation.message, status: policyViolation.status });
    }

    const executionMode = isReleaseExecutionMode(body.executionMode) ? body.executionMode : "browser_wallet";
    const result = await queueMilestoneRelease(id, ownerUserId, productContext.workspaceId, body.amountUsdc, executionMode);
    if (executionMode === "circle_wallet") await claimReleaseExecution(result.release.id, productContext.workspaceId);

    if (executionMode === "circle_wallet") {
      const sendResult = await sendUsdcOnArc({
        recipient: result.release.destinationWalletAddress,
        amount: body.amountUsdc,
        tokenAddress: ARC_CONFIG.usdcAddress,
        executionMode: "circle_wallet",
        payoutId: result.release.payoutId,
        milestoneId: result.release.milestoneId ?? id,
        releaseId: result.release.id,
      });

      if (sendResult.status === "confirmed" || sendResult.status === "failed") {
        if (sendResult.sourceWalletAddress) {
          await recordReleaseSourceWallet(result.release.id, productContext.workspaceId, sendResult.sourceWalletAddress);
        }
        if (sendResult.txHash) await recordReleaseTransactionHash(result.release.id, productContext.workspaceId, sendResult.txHash);
        const refreshed = await refreshReleaseProof(result.release.id, ownerUserId, productContext.workspaceId, {
          status: sendResult.status,
          txHash: sendResult.txHash,
          network: sendResult.network,
          explorerUrl: sendResult.explorerUrl,
          failureReason: sendResult.status === "failed"
            ? `CIRCLE_WALLET_TRUSTED_FAILURE: ${sendResult.errorMessage ?? "Executor reported failure."}`
            : sendResult.errorMessage,
        }, { trustedCircleWalletExecution: true });

        return NextResponse.json(refreshed, { status: 201 });
      }
      if (sendResult.status === "pending") {
        if (sendResult.sourceWalletAddress) {
          await recordReleaseSourceWallet(result.release.id, productContext.workspaceId, sendResult.sourceWalletAddress);
        }
        const pending = await markReleaseReconciliationPending(result.release.id, productContext.workspaceId, {
          txHash: sendResult.txHash,
          network: sendResult.network,
          explorerUrl: sendResult.explorerUrl,
          reason: sendResult.errorMessage ?? "Arc submission outcome requires reconciliation.",
        });
        return NextResponse.json(pending, { status: 202 });
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });

    const code = error instanceof Error ? error.message : "UNABLE_TO_QUEUE_RELEASE";
    return apiErrorFromCode(
      code,
      {
        MILESTONE_NOT_FOUND: 404,
        WORKSPACE_SCOPE_MISMATCH: 409,
        USER_NOT_FOUND: 404,
        USER_NOT_ALLOWED_TO_RELEASE: 403,
        MILESTONE_NOT_APPROVED: 409,
        PAYOUT_NOT_RELEASE_READY: 409,
        RELEASE_ALREADY_EXISTS: 409,
        DESTINATION_WALLET_MISSING: 400,
        RELEASE_AMOUNT_MISMATCH: 400,
        PROOF_NOT_FOUND: 409,
        PROOF_NOT_PENDING: 409,
        RELEASE_NOT_REFRESHABLE: 409,
        STALE_PROOF_REFRESH: 409,
        MILESTONE_NOT_APPROVED_FOR_CONFIRMATION: 409,
        TX_HASH_REQUIRED: 400,
        FAILURE_REASON_REQUIRED: 400,
        SOURCE_WALLET_MISMATCH: 409,
        SOURCE_WALLET_REQUIRED: 409,
      },
      {
        MILESTONE_NOT_FOUND: "Milestone not found.",
        USER_NOT_FOUND: "Owner context user not found.",
        USER_NOT_ALLOWED_TO_RELEASE: "User is not allowed to release this milestone.",
        MILESTONE_NOT_APPROVED: "Milestone must be approved before release.",
        PAYOUT_NOT_RELEASE_READY: "Payout is not in a release-ready state for settlement.",
        RELEASE_ALREADY_EXISTS: "A release already exists for this milestone.",
        DESTINATION_WALLET_MISSING: "Destination wallet is missing.",
        RELEASE_AMOUNT_MISMATCH: "Release amount must match the milestone amount.",
        SOURCE_WALLET_MISMATCH: "Release source wallet does not match the trusted executor.",
        SOURCE_WALLET_REQUIRED: "Release source wallet is required before confirmation.",
      },
      { message: "Unable to queue release.", status: 500 },
    );
  }
}
