export type TransactionProofStatus = "pending" | "confirmed" | "failed";

export type TransactionProof = {
  id: string;
  releaseId?: string;
  milestoneId: string;
  txHash: string;
  network: string;
  status: TransactionProofStatus;
  explorerUrl: string;
  blockNumber?: string;
  failureReason?: string;
  confirmedAt?: string;
  failedAt?: string;
};
