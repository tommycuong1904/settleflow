import type { ArcSendResult } from "@/lib/arc/types";
import type { TransactionProof } from "@/lib/models/transaction-proof";

type MapSendResultToProofParams = {
  result: ArcSendResult;
  milestoneId: string;
};

export function mapSendResultToProof({
  result,
  milestoneId,
}: MapSendResultToProofParams): TransactionProof | null {
  if (!result.txHash || !result.explorerUrl || !result.network) {
    return null;
  }

  return {
    id: `proof-${milestoneId}-${result.txHash}`,
    milestoneId,
    txHash: result.txHash,
    network: result.network,
    status: result.status,
    explorerUrl: result.explorerUrl,
  };
}
