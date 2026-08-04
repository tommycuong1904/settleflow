import type { ArcExecutionMode } from "@/lib/arc/types";

const executionMode =
  (process.env.NEXT_PUBLIC_ARC_EXECUTION_MODE as ArcExecutionMode | undefined) ??
  "demo";

export const ARC_CONFIG = {
  chainId: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002),
  rpcUrl:
    process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network",
  explorerUrl:
    process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ?? "https://testnet.arcscan.app",
  usdcAddress:
    process.env.NEXT_PUBLIC_USDC_ADDRESS ??
    "0x3600000000000000000000000000000000000000",
  executionMode,
} as const;
