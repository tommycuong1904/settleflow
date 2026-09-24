import { createPublicClient, http, parseAbiItem, type Address, type Hex } from "viem";
import { ARC_CONFIG } from "@/lib/arc/config";
import { arcChain } from "@/lib/arc/onchain";
import { verifyReleaseTransaction } from "@/lib/arc/verify-release-transaction";

const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const LOOKBACK_BLOCKS = BigInt(4_096);

type ReconciliationRelease = {
  amountUsdc: string;
  destinationWalletAddress: string;
  sourceWalletAddress: string;
  requestedAt: Date;
  executionMode: "browser_wallet";
};

type ReconciliationClient = {
  getBlockNumber: () => Promise<bigint>;
  getLogs: (args: unknown) => Promise<Array<{ transactionHash: Hex | null; blockNumber: bigint | null }>>;
  getBlock: (args: { blockNumber: bigint }) => Promise<{ timestamp: bigint }>;
  getTransaction: (args: { hash: Hex }) => Promise<unknown>;
  getTransactionReceipt: (args: { hash: Hex }) => Promise<unknown>;
};

export type ReleaseTransactionCandidate = {
  txHash: string;
  blockNumber: string;
  confirmedAt: string;
  explorerUrl: string;
};

/**
 * Finds only confirmed USDC transfers that independently pass the existing
 * release snapshot verifier. This is reconciliation assistance, not a retry
 * decision: an empty or ambiguous result must leave the release pending.
 */
export async function findReleaseTransactionCandidates(
  release: ReconciliationRelease,
  client: ReconciliationClient = createPublicClient({
    chain: arcChain,
    transport: http(ARC_CONFIG.rpcUrl, { timeout: 8_000, retryCount: 1 }),
  }) as unknown as ReconciliationClient,
): Promise<ReleaseTransactionCandidate[]> {
  const latestBlock = await client.getBlockNumber();
  const fromBlock = latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : BigInt(0);
  const logs = await client.getLogs({
    address: ARC_CONFIG.usdcAddress as Address,
    event: transferEvent,
    args: {
      from: release.sourceWalletAddress as Address,
      to: release.destinationWalletAddress as Address,
    },
    fromBlock,
    toBlock: latestBlock,
  });

  const requestedAtMs = release.requestedAt.getTime();
  const candidateBlocks = new Map<string, bigint>();
  for (const log of logs) {
    if (log.transactionHash && log.blockNumber !== null) {
      candidateBlocks.set(log.transactionHash, log.blockNumber);
    }
  }

  const candidates: ReleaseTransactionCandidate[] = [];
  for (const [txHash, blockNumber] of candidateBlocks) {
    const block = await client.getBlock({ blockNumber });
    const confirmedAtMs = Number(block.timestamp) * 1_000;
    if (!Number.isFinite(confirmedAtMs) || confirmedAtMs < requestedAtMs) continue;

    try {
      await verifyReleaseTransaction({ release, txHash, client });
      candidates.push({
        txHash,
        blockNumber: blockNumber.toString(),
        confirmedAt: new Date(confirmedAtMs).toISOString(),
        explorerUrl: `${ARC_CONFIG.explorerUrl}/tx/${txHash}`,
      });
    } catch {
      // A log match alone is insufficient; the full snapshot verifier is the
      // authority for token, amount, source, recipient, chain, and receipt.
    }
  }

  return candidates.sort((left, right) => right.confirmedAt.localeCompare(left.confirmedAt));
}
