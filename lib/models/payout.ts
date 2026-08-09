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
  totalAmount: number;
  currency: "USDC";
  status: PayoutStatus;
  createdAt: string;
};
