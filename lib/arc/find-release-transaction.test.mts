import assert from "node:assert/strict";
import test from "node:test";
import { encodeAbiParameters, encodeEventTopics, erc20Abi } from "viem";
import { ARC_CONFIG } from "@/lib/arc/config";
import { findReleaseTransactionCandidates } from "@/lib/arc/find-release-transaction";

const source = "0x1111111111111111111111111111111111111111";
const destination = "0x2222222222222222222222222222222222222222";
const matchingHash = `0x${"ab".repeat(32)}` as const;
const oldHash = `0x${"cd".repeat(32)}` as const;
const requestedAt = new Date("2026-09-24T10:00:00.000Z");
const requestedAtSeconds = BigInt(Math.floor(requestedAt.getTime() / 1_000));
const transferTopics = encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from: source, to: destination } });
const receipt = {
  status: "success",
  logs: [{
    address: ARC_CONFIG.usdcAddress,
    topics: transferTopics,
    data: encodeAbiParameters([{ type: "uint256" }], [BigInt(1_000_000)]),
  }],
};

function clientWithLogs(logs: Array<{ transactionHash: typeof matchingHash; blockNumber: bigint }>) {
  return {
    getBlockNumber: async () => BigInt(5_000),
    getLogs: async () => logs,
    getBlock: async ({ blockNumber }: { blockNumber: bigint }) => ({
      timestamp: blockNumber === BigInt(4_998) ? requestedAtSeconds + BigInt(60) : requestedAtSeconds - BigInt(60),
    }),
    getTransaction: async ({ hash }: { hash: typeof matchingHash }) => ({
      chainId: ARC_CONFIG.chainId,
      from: source,
      to: ARC_CONFIG.usdcAddress,
      value: BigInt(0),
      hash,
    }),
    getTransactionReceipt: async () => receipt,
  };
}

test("reconciliation finds only a post-release transaction that passes the full snapshot", async () => {
  const candidates = await findReleaseTransactionCandidates({
    amountUsdc: "1",
    destinationWalletAddress: destination,
    sourceWalletAddress: source,
    requestedAt,
    executionMode: "browser_wallet",
  }, clientWithLogs([
    { transactionHash: oldHash, blockNumber: BigInt(4_997) },
    { transactionHash: matchingHash, blockNumber: BigInt(4_998) },
  ]));

  assert.deepEqual(candidates.map((candidate) => candidate.txHash), [matchingHash]);
  assert.equal(candidates[0]?.blockNumber, "4998");
});

test("reconciliation never treats a token transfer with the wrong amount as a candidate", async () => {
  const wrongAmountClient = {
    ...clientWithLogs([{ transactionHash: matchingHash, blockNumber: BigInt(4_998) }]),
    getTransactionReceipt: async () => ({
      ...receipt,
      logs: [{ ...receipt.logs[0], data: encodeAbiParameters([{ type: "uint256" }], [BigInt(2_000_000)]) }],
    }),
  };
  const candidates = await findReleaseTransactionCandidates({
    amountUsdc: "1",
    destinationWalletAddress: destination,
    sourceWalletAddress: source,
    requestedAt,
    executionMode: "browser_wallet",
  }, wrongAmountClient);

  assert.deepEqual(candidates, []);
});
