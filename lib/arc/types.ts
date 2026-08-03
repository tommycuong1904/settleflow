export type ArcExecutionMode = "mock" | "demo" | "real";

export type ArcSendStatus = "pending" | "confirmed" | "failed";

export type ArcSendRequest = {
  recipient: string;
  amount: number;
  tokenAddress: string;
  payoutId?: string;
  milestoneId?: string;
  note?: string;
};

export type ArcSendResult = {
  status: ArcSendStatus;
  txHash?: string;
  explorerUrl?: string;
  network?: string;
  errorMessage?: string;
  confirmedAt?: string;
};
