export type PaymentAttempt = {
  id: string;
  milestoneId: string;
  method: "simulated" | "crypto_wallet";
  status: "pending" | "completed" | "failed" | "cancelled";
  evidenceType: "none" | "transaction";
  amount: number;
  currency: string;
  recipientLabel: string;
  completedAt?: string;
};
