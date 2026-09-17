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
  logs: Array<{ data: Hex; topics: readonly Hex[]; address: string }>;
};

type VerificationClient = {
  getTransaction: (args: { hash: Hex }) => Promise<ReleaseTransaction>;
  getTransactionReceipt: (args: { hash: Hex }) => Promise<ReleaseReceipt>;
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
  const tx = await client.getTransaction({ hash: txHash as Hex });
  const receipt = await client.getTransactionReceipt({ hash: txHash as Hex });
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
    try { return { decoded: decodeEventLog({ abi: transferAbi, data: log.data, topics: log.topics }), address: log.address }; }
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
