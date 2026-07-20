export type ArcSendRequest = {
  recipient: string;
  amount: number;
  tokenAddress: string;
  note?: string;
};

export type ArcSendResult = {
  status: "pending" | "confirmed" | "failed";
  txHash?: string;
  explorerUrl?: string;
};
