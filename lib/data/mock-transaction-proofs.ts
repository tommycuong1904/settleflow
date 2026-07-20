import type { TransactionProof } from "@/lib/models/transaction-proof";

export const mockTransactionProofs: TransactionProof[] = [
  {
    id: "proof-1",
    milestoneId: "milestone-1",
    txHash:
      "0xabc123def4567890abc123def4567890abc123def4567890abc123def4567890",
    network: "Arc Testnet",
    status: "confirmed",
    explorerUrl:
      "https://testnet.arcscan.app/tx/0xabc123def4567890abc123def4567890abc123def4567890abc123def4567890",
  },
  {
    id: "proof-2",
    milestoneId: "milestone-6",
    txHash:
      "0xdef456abc1237890def456abc1237890def456abc1237890def456abc1237890",
    network: "Arc Testnet",
    status: "confirmed",
    explorerUrl:
      "https://testnet.arcscan.app/tx/0xdef456abc1237890def456abc1237890def456abc1237890def456abc1237890",
  },
];
