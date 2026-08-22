export type PayoutStatus =
  | "draft"
  | "active"
  | "partially_released"
  | "completed";

export type Payout = {
  id: string;
  title: string;
  description?: string;
  contributorId: string;
  createdByUserId?: string;
  targetWalletAddress?: string;
  creatorWalletAddress?: string;
  creatorEmail?: string;
  totalAmount: number;
  currency: "USDC";
  status: PayoutStatus;
  createdAt: string;
};
