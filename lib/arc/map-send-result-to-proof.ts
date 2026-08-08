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
  if (!result.txHash || !result.explorerUrl || !result.network) {
    return null;
  }

  return {
    id: `proof-${milestoneId}-${result.txHash}`,
    releaseId,
    milestoneId,
    txHash: result.txHash,
    network: result.network,
    status: result.status,
    explorerUrl: result.explorerUrl,
    confirmedAt: result.confirmedAt,
  };
}
