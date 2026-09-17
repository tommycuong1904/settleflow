import { createPublicClient, decodeEventLog, erc20Abi, http, type Hex } from "viem";
import { ARC_CONFIG } from "@/lib/arc/config";
import { arcChain } from "@/lib/arc/onchain";

const NATIVE_USDC = "0x3600000000000000000000000000000000000000";
const transferAbi = erc20Abi.filter((item) => item.type === "event" && item.name === "Transfer");

type ReleaseTransaction = {
  from: string;
  chainId: number | bigint;
  to?: string | null;
  value: bigint;
};

type ReleaseReceipt = {
  status: string;
  logs: Array<{ data: Hex; topics: unknown; address: string }>;
};

type VerificationClient = {
  getTransaction: (args: { hash: Hex }) => Promise<unknown>;
  getTransactionReceipt: (args: { hash: Hex }) => Promise<unknown>;
};

type TransferEvent = {
  eventName: "Transfer";
  args: { from?: string; to?: string; value?: bigint };
};

function isTransferEvent(value: unknown): value is TransferEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as { eventName?: unknown; args?: unknown };
  return event.eventName === "Transfer" && !!event.args && typeof event.args === "object";
}

function isReleaseTransaction(value: unknown): value is ReleaseTransaction {
  if (!value || typeof value !== "object") return false;
  const transaction = value as Partial<ReleaseTransaction>;
  return typeof transaction.from === "string" && (typeof transaction.chainId === "number" || typeof transaction.chainId === "bigint") && typeof transaction.value === "bigint";
}

function isReleaseReceipt(value: unknown): value is ReleaseReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<ReleaseReceipt>;
  return typeof receipt.status === "string" && Array.isArray(receipt.logs);
}

function parseTopics(value: unknown): [Hex, ...Hex[]] | null {
  if (!Array.isArray(value) || value.length === 0 || !value.every((topic) => typeof topic === "string" && topic.startsWith("0x"))) return null;
  return value as [Hex, ...Hex[]];
}

function decimalToUnits(value: unknown, decimals: number): bigint {
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error("TX_SNAPSHOT_MISMATCH");
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > decimals) throw new Error("TX_SNAPSHOT_MISMATCH");
  return BigInt(whole) * BigInt("10") ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
}

export async function verifyReleaseTransaction({
  release,
  txHash,
  client: injectedClient,
  tokenAddress,
}: {
  release: { amountUsdc: unknown; destinationWalletAddress: string; sourceWalletAddress: string | null };
  txHash: string;
  client?: VerificationClient;
  tokenAddress?: string;
}): Promise<{ sourceWalletAddress: string }> {
  const client: VerificationClient = injectedClient ?? createPublicClient({ chain: arcChain, transport: http(ARC_CONFIG.rpcUrl) });
  const transaction = await client.getTransaction({ hash: txHash as Hex });
  const receiptResult = await client.getTransactionReceipt({ hash: txHash as Hex });
  if (!isReleaseTransaction(transaction) || !isReleaseReceipt(receiptResult)) throw new Error("TX_SNAPSHOT_MISMATCH");
  const tx = transaction;
  const receipt = receiptResult;
  const sourceWalletAddress = tx.from.toLowerCase();
  if (receipt.status !== "success" || Number(tx.chainId) !== ARC_CONFIG.chainId) throw new Error("TX_SNAPSHOT_MISMATCH");
  if (release.sourceWalletAddress && tx.from.toLowerCase() !== release.sourceWalletAddress.toLowerCase()) throw new Error("TX_SNAPSHOT_MISMATCH");

  const amount = String(release.amountUsdc);
  const destination = release.destinationWalletAddress.toLowerCase();
  const token = (tokenAddress ?? ARC_CONFIG.usdcAddress).toLowerCase();
  if (token === NATIVE_USDC) {
    if (tx.to?.toLowerCase() !== destination || tx.value !== decimalToUnits(amount, 18)) {
      throw new Error("TX_SNAPSHOT_MISMATCH");
    }
    return { sourceWalletAddress };
  }

  if (tx.to?.toLowerCase() !== token) throw new Error("TX_SNAPSHOT_MISMATCH");
  const transfer = receipt.logs.map((log) => {
    const topics = parseTopics(log.topics);
    if (!topics) return null;
    try { return { decoded: decodeEventLog({ abi: transferAbi, data: log.data, topics }), address: log.address }; }
    catch { return null; }
  }).find((entry) => isTransferEvent(entry?.decoded) && String(entry.decoded.args.to).toLowerCase() === destination);
  if (!transfer || !isTransferEvent(transfer.decoded) || transfer.address.toLowerCase() !== token || transfer.decoded.args.from?.toLowerCase() !== tx.from.toLowerCase() || transfer.decoded.args.value !== decimalToUnits(amount, 6)) {
    throw new Error("TX_SNAPSHOT_MISMATCH");
  }
  return { sourceWalletAddress };
}

export function isReleaseTransactionMismatch(error: unknown): boolean {
  return error instanceof Error && error.message === "TX_SNAPSHOT_MISMATCH";
}

export function getReleaseVerificationChainId() {
  return ARC_CONFIG.chainId;
}

export function getReleaseVerificationToken() {
  return ARC_CONFIG.usdcAddress;
}
