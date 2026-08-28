import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  http,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { ARC_CONFIG } from "@/lib/arc/config";
import { arcChain } from "@/lib/arc/onchain";
import type {
  ArcSendRequest,
  ArcSendResult,
  ReleaseExecutionMode,
} from "@/lib/arc/types";

export type ReleaseExecutor = (
  request: ArcSendRequest,
) => Promise<ArcSendResult>;

/** USDC is the native gas token on Arc Testnet. */
const NATIVE_USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
/** Standard ERC-20 USDC uses 6 decimals when an explicit contract is configured. */
const ERC20_USDC_DECIMALS = 6;
const RECEIPT_TIMEOUT_MS = 90_000;

export type CircleWalletExecutorDeps = {
  sendTransaction: (args: {
    to: Address;
    value: bigint;
    data?: Hex;
  }) => Promise<Hex>;
  waitForReceipt: (txHash: Hex) => Promise<{ status: "success" | "reverted" | undefined }>;
  sourceAddress: Address;
};

export type ReleaseExecutorDeps = {
  circleWallet?: CircleWalletExecutorDeps;
};

function failedResult(errorMessage: string): ArcSendResult {
  return { status: "failed", network: "Arc Testnet", errorMessage };
}

function isNativeUsdc(tokenAddress: string): boolean {
  return tokenAddress.trim().toLowerCase() === NATIVE_USDC_ADDRESS;
}

function buildCircleWalletDeps(privateKey: string): CircleWalletExecutorDeps {
  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({
    account,
    chain: arcChain,
    transport: http(ARC_CONFIG.rpcUrl),
  });
  const publicClient = createPublicClient({
    chain: arcChain,
    transport: http(ARC_CONFIG.rpcUrl),
  });

  return {
    sourceAddress: account.address,
    sendTransaction: async (args) => walletClient.sendTransaction(args),
    waitForReceipt: async (txHash) => {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: RECEIPT_TIMEOUT_MS,
      });
      return { status: receipt.status };
    },
  };
}

async function executeBrowserWallet(): Promise<ArcSendResult> {
  return failedResult(
    "Browser wallet execution runs in the client release flow; this server-side executor cannot sign for a browser wallet.",
  );
}

async function executeCircleWallet(
  request: ArcSendRequest,
  deps?: CircleWalletExecutorDeps,
): Promise<ArcSendResult> {
  const privateKey = process.env.ARC_SERVER_PRIVATE_KEY;
  if (!privateKey) {
    return failedResult(
      "Circle Wallets execution requires ARC_SERVER_PRIVATE_KEY to be configured on the server.",
    );
  }

  let resolvedDeps: CircleWalletExecutorDeps;
  try {
    resolvedDeps = deps ?? buildCircleWalletDeps(privateKey);
  } catch (error) {
    return failedResult(
      `Invalid ARC_SERVER_PRIVATE_KEY: ${error instanceof Error ? error.message : "unable to derive the server account"}.`,
    );
  }

  const destination = request.recipient.trim() as Address;

  try {
    const txHash = isNativeUsdc(request.tokenAddress)
      ? await resolvedDeps.sendTransaction({
          to: destination,
          value: parseUnits(request.amount, 18),
        })
      : await resolvedDeps.sendTransaction({
          to: request.tokenAddress.trim() as Address,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [destination, parseUnits(request.amount, ERC20_USDC_DECIMALS)],
          }),
        });

    const receipt = await resolvedDeps.waitForReceipt(txHash);
    if (receipt.status !== "success") {
      return failedResult("Arc transfer reverted on-chain.");
    }

    return {
      status: "confirmed",
      txHash,
      explorerUrl: `${ARC_CONFIG.explorerUrl}/tx/${txHash}`,
      network: "Arc Testnet",
      confirmedAt: new Date().toISOString(),
      sourceWalletAddress: resolvedDeps.sourceAddress,
    };
  } catch (error) {
    return failedResult(
      error instanceof Error
        ? `Arc transfer failed: ${error.message}`
        : "Arc transfer failed.",
    );
  }
}

/** Keep wallet-specific signing behind one release boundary. */
export function createReleaseExecutor(
  mode: ReleaseExecutionMode,
  deps?: ReleaseExecutorDeps,
): ReleaseExecutor {
  return async (request: ArcSendRequest): Promise<ArcSendResult> => {
    if (mode === "browser_wallet") return executeBrowserWallet();
    return executeCircleWallet(request, deps?.circleWallet);
  };
}
