import { createPublicClient, decodeEventLog, erc20Abi, http, type Hex } from "viem";
import { ARC_CONFIG } from "@/lib/arc/config";
import { arcChain } from "@/lib/arc/onchain";

const NATIVE_USDC = "0x3600000000000000000000000000000000000000";
const transferAbi = erc20Abi.filter((item) => item.type === "event" && item.name === "Transfer");

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
  client?: { getTransaction: (args: { hash: Hex }) => Promise<any>; getTransactionReceipt: (args: { hash: Hex }) => Promise<any> };
  tokenAddress?: string;
}): Promise<{ sourceWalletAddress: string }> {
  const client = injectedClient ?? createPublicClient({ chain: arcChain, transport: http(ARC_CONFIG.rpcUrl) });
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
  const transfer = receipt.logs.map((log: { data: Hex; topics: readonly Hex[]; address: string }) => {
    try { return { decoded: decodeEventLog({ abi: transferAbi, data: log.data, topics: [...log.topics] as any }), address: log.address }; }
    catch { return null; }
  }).find((entry: { decoded: any; address: string } | null) => entry?.decoded.eventName === "Transfer" && String(entry.decoded.args.to).toLowerCase() === destination);
  if (!transfer || transfer.address.toLowerCase() !== token || transfer.decoded.args.from.toLowerCase() !== tx.from.toLowerCase() || transfer.decoded.args.value !== decimalToUnits(amount, 6)) {
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
