export type TransactionProofStatus = "pending" | "confirmed" | "failed";

export type TransactionProof = {
  id: string;
  releaseId?: string;
  milestoneId: string;
  txHash: string;
  network: string;
  status: TransactionProofStatus;
  explorerUrl: string;
  confirmedAt?: string;
};
