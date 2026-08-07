import { ARC_CONFIG } from "@/lib/arc/config";
import type { ArcSendRequest, ArcSendResult } from "@/lib/arc/types";
import { createReleaseExecutor } from "@/lib/arc/release-executor";

function buildExplorerUrl(txHash: string) {
  return `${ARC_CONFIG.explorerUrl}/tx/${txHash}`;
}

function buildMockTxHash(request: ArcSendRequest) {
  const payoutPart = request.payoutId ?? "payout";
  const milestonePart = request.milestoneId ?? "milestone";

  return `0xmock-${payoutPart}-${milestonePart}`;
}

async function sendMockUsdcOnArc(
  request: ArcSendRequest,
): Promise<ArcSendResult> {
  const txHash = buildMockTxHash(request);

  return {
    status: "pending",
    txHash,
    explorerUrl: buildExplorerUrl(txHash),
    network: `Arc Testnet (${ARC_CONFIG.executionMode})`,
  };
}

async function sendDemoUsdcOnArc(
  request: ArcSendRequest,
): Promise<ArcSendResult> {
  const txHash = `0xdemo-${request.milestoneId ?? "milestone"}-${Date.now()}`;

  return {
    status: "confirmed",
    txHash,
    explorerUrl: buildExplorerUrl(txHash),
    network: "Arc Testnet",
    confirmedAt: new Date().toISOString(),
  };
}

async function sendRealUsdcOnArc(
  request: ArcSendRequest,
): Promise<ArcSendResult> {
  if (!request.executionMode) {
    return {
      status: "failed",
      network: "Arc Testnet",
      errorMessage: "A release execution mode is required for live execution.",
    };
  }

  return createReleaseExecutor(request.executionMode)(request);
}

export async function sendUsdcOnArc(
  request: ArcSendRequest,
): Promise<ArcSendResult> {
  switch (ARC_CONFIG.executionMode) {
    case "demo":
      return sendDemoUsdcOnArc(request);
    case "real":
      return sendRealUsdcOnArc(request);
    case "mock":
    default:
      return sendMockUsdcOnArc(request);
  }
}
