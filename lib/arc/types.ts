export type ReleaseExecutionMode = "browser_wallet" | "circle_wallet";
export type ArcExecutionMode = "mock" | "demo" | "real";

export type ArcSendStatus = "pending" | "confirmed" | "failed";

export type ArcSendRequest = {
  recipient: string;
  amount: string;
  tokenAddress: string;
  executionMode?: ReleaseExecutionMode;
  payoutId?: string;
  milestoneId?: string;
  releaseId?: string;
  note?: string;
};

export type ArcSendResult = {
  status: ArcSendStatus;
  txHash?: string;
  explorerUrl?: string;
  network?: string;
  errorMessage?: string;
  confirmedAt?: string;
  sourceWalletAddress?: string;
};
