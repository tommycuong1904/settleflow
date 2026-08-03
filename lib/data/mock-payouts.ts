import type { Payout } from "@/lib/models/payout";

export const mockPayouts: Payout[] = [
  {
    id: "payout-detail",
    title: "Smart Contract QA Support",
    contributorId: "contrib-2",
    totalAmount: 450,
    currency: "USDC",
    status: "active",
    createdAt: "2026-07-19T10:00:00Z",
  },
  {
    id: "payout-3",
    title: "Growth Content Sprint",
    contributorId: "contrib-3",
    totalAmount: 500,
    currency: "USDC",
    status: "completed",
    createdAt: "2026-07-18T07:45:00Z",
  },
];
