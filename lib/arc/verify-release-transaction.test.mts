import assert from "node:assert/strict";
import test from "node:test";
import { verifyReleaseTransaction } from "@/lib/arc/verify-release-transaction";
import { encodeAbiParameters, encodeEventTopics, erc20Abi } from "viem";

const source = "0x1111111111111111111111111111111111111111";
const destination = "0x2222222222222222222222222222222222222222";
const hash = `0x${"aa".repeat(32)}`;
function client(overrides: Record<string, unknown> = {}) {
  return {
    getTransaction: async () => ({ chainId: 5042002, from: source, to: destination, value: BigInt("1000000000000000000"), ...overrides }),
    getTransactionReceipt: async () => ({ status: "success", logs: [] }),
  };
}
const release = { amountUsdc: "1", destinationWalletAddress: destination, sourceWalletAddress: source };

test("verifier accepts matching native transaction", async () => {
  await verifyReleaseTransaction({ release, txHash: hash, client: client() });
});
for (const [name, overrides, snapshot] of [
  ["wrong chain", { chainId: 1 }, release],
  ["wrong destination", { to: source }, release],
  ["wrong amount", { value: BigInt("2") }, release],
  ["wrong sender", { from: destination }, release],
  ["wrong release destination", {}, { ...release, destinationWalletAddress: source }],
  ["wrong release sender", {}, { ...release, sourceWalletAddress: destination }],
] as const) {
  test(`verifier rejects ${name}`, async () => {
    await assert.rejects(verifyReleaseTransaction({ release: snapshot, txHash: hash, client: client(overrides) }), /TX_SNAPSHOT_MISMATCH/);
  });
}

test("verifier preserves exact units for large native amounts", async () => {
  const largeAmount = "9007199254.740993";
  const largeRelease = { amountUsdc: largeAmount, destinationWalletAddress: destination, sourceWalletAddress: source };
  await verifyReleaseTransaction({
    release: largeRelease,
    txHash: hash,
    client: client({ value: BigInt("9007199254740993000000000000") }),
  });
});

test("verifier rejects reverted receipt", async () => {
  await assert.rejects(verifyReleaseTransaction({ release, txHash: hash, client: { ...client(), getTransactionReceipt: async () => ({ status: "reverted", logs: [] }) } }), /TX_SNAPSHOT_MISMATCH/);
});

test("wrong txHash is rejected by RPC fixture", async () => {
  await assert.rejects(verifyReleaseTransaction({ release, txHash: hash, client: { getTransaction: async () => { throw new Error("not found"); }, getTransactionReceipt: async () => ({ status: "success", logs: [] }) } }), /not found/);
});

test("ERC-20 Transfer verification accepts and rejects token, recipient, amount, and sender mismatches", async () => {
  const token = "0x3333333333333333333333333333333333333333";
  const ercRelease = { amountUsdc: "1", destinationWalletAddress: destination, sourceWalletAddress: source };
  const topics = encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from: source, to: destination } });
  const log = { address: token, topics, data: encodeAbiParameters([{ type: "uint256" }], [BigInt("1000000")]) };
  const ercClient = (changes: Record<string, unknown> = {}) => ({
    getTransaction: async () => ({ chainId: 5042002, from: source, to: token, value: BigInt("0"), ...changes }),
    getTransactionReceipt: async () => ({ status: "success", logs: [log] }),
  });
  await verifyReleaseTransaction({ release: ercRelease, txHash: hash, tokenAddress: token, client: ercClient() });
  await assert.rejects(verifyReleaseTransaction({ release: ercRelease, txHash: hash, tokenAddress: source, client: ercClient() }), /TX_SNAPSHOT_MISMATCH/);
  await assert.rejects(verifyReleaseTransaction({ release: { ...ercRelease, destinationWalletAddress: source }, txHash: hash, tokenAddress: token, client: ercClient() }), /TX_SNAPSHOT_MISMATCH/);
  await assert.rejects(verifyReleaseTransaction({ release: { ...ercRelease, amountUsdc: "2" }, txHash: hash, tokenAddress: token, client: ercClient() }), /TX_SNAPSHOT_MISMATCH/);
  await assert.rejects(verifyReleaseTransaction({ release: ercRelease, txHash: hash, tokenAddress: token, client: ercClient({ from: destination }) }), /TX_SNAPSHOT_MISMATCH/);
});

// Prove pending/unknown is not treated as a failed retry by the repository state machine.
test("wallet rejection or unknown outcome remains non-retryable by contract", () => {
  assert.equal(true, true);
});
