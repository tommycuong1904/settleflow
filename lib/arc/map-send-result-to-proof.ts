import type { ArcSendResult } from "@/lib/arc/types";
import type { TransactionProof } from "@/lib/models/transaction-proof";

type MapSendResultToProofParams = {
  result: ArcSendResult;
  milestoneId: string;
  releaseId?: string;
};

export function mapSendResultToProof({
  result,
  milestoneId,
  releaseId,
}: MapSendResultToProofParams): TransactionProof | null {
  if (result.status === "confirmed" && (!result.txHash || !result.explorerUrl || !result.network)) {
    return null;
  }

  if (result.status === "failed" && !result.network) {
    return null;
  }

  return {
    id: `proof-${milestoneId}-${result.txHash ?? result.status}`,
    releaseId,
    milestoneId,
    txHash: result.txHash ?? "",
    network: result.network ?? "Arc Testnet",
    status: result.status,
    explorerUrl: result.explorerUrl ?? "",
    confirmedAt: result.confirmedAt,
  };
}
