export type TransactionProofStatus = "pending" | "confirmed" | "failed";
export type TransactionProofExecutionMode = "browser_wallet" | "circle_wallet" | "circle_user_wallet";
export type TransactionProofReleaseStatus = "queued" | "pending" | "confirmed" | "failed" | "cancelled";

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
  executionMode?: TransactionProofExecutionMode;
  releaseTxHash?: string;
  releaseArcRequestId?: string;
  releaseStatus?: TransactionProofReleaseStatus;
};
