"use client";

import { AppKit, type SendParams } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { getAddress, type EIP1193Provider } from "viem";
import { addArcNetworkToWallet } from "@/lib/arc/onchain";

export class BrowserWalletPreBroadcastError extends Error {}
export class BrowserWalletSubmissionUnknownError extends Error {}

export type EIP6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

export type EIP6963ProviderDetail = {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
};

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<EIP6963ProviderDetail>;
  }
}

export async function discoverBrowserWallets(): Promise<EIP6963ProviderDetail[]> {
  const providers = new Map<string, EIP6963ProviderDetail>();

  const handleProviderAnnouncement = (
    event: WindowEventMap["eip6963:announceProvider"],
  ) => {
    providers.set(event.detail.info.uuid, event.detail);
  };

  window.addEventListener("eip6963:announceProvider", handleProviderAnnouncement);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  await new Promise((resolve) => window.setTimeout(resolve, 500));
  window.removeEventListener("eip6963:announceProvider", handleProviderAnnouncement);

  const discovered = [...providers.values()];
  if (discovered.length > 0) {
    return discovered;
  }

  const fallbackProvider = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
  if (fallbackProvider) {
    return [
      {
        info: {
          uuid: "window.ethereum",
          name: "Injected wallet",
          icon: "",
          rdns: "window.ethereum",
        },
        provider: fallbackProvider,
      },
    ];
  }

    return [];
}

async function connectWallet(provider: EIP1193Provider) {
  await provider.request({
    method: "eth_requestAccounts",
    params: undefined,
  });

  const accounts = (await provider.request({
    method: "eth_accounts",
    params: undefined,
  })) as string[];

  return {
    connectedAddress: accounts[0] ?? null,
  };
}

export async function connectBrowserWallet(preferredWallet?: string) {
  const providers = await discoverBrowserWallets();
  const preferredName = preferredWallet?.trim().toLowerCase();
  const selectedWallet =
    (preferredName
      ? providers.find(({ info }) => info.name.toLowerCase() === preferredName || info.name.toLowerCase().includes(preferredName))
      : undefined) ??
    providers.find(({ info }) => info.rdns === "io.metamask" || info.name === "MetaMask") ??
    providers[0];

  if (providers.length === 0) {
    // No wallet detected – return a placeholder to avoid throwing during dev/testing.
    // Adapter is set to null; callers should handle null gracefully.
    return {
      adapter: null as unknown as Awaited<ReturnType<typeof createViemAdapterFromProvider>>,
      connectedAddress: null,
      walletName: "No Wallet Detected",
    };
  }
  if (!selectedWallet) {
    throw new Error("No EIP-6963 browser wallet found.");
  }

  const { connectedAddress } = await connectWallet(selectedWallet.provider);
  if (!connectedAddress) {
    throw new Error("Browser wallet connected without an account.");
  }

  const adapter = await createViemAdapterFromProvider({
    provider: selectedWallet.provider,
  });

  return {
    adapter,
    connectedAddress,
    walletName: selectedWallet.info.name,
    provider: selectedWallet.provider,
  };
}

export async function assertBrowserWalletMatchesAuthenticatedAccount(expectedSender: string) {
  const { connectedAddress } = await connectBrowserWallet();
  if (!connectedAddress) {
    throw new BrowserWalletPreBroadcastError("Browser wallet connected without an account.");
  }
  if (connectedAddress.toLowerCase() !== expectedSender.toLowerCase()) {
    throw new BrowserWalletPreBroadcastError(
      `Switch the active wallet account from ${connectedAddress} to the authenticated Web3 account ${expectedSender}, then try again.`,
    );
  }
}

export async function sendUsdcWithBrowserWallet(input: {
  recipient: string;
  amount: string;
  expectedSender?: string;
}) {
  const withTimeout = async <T,>(promise: Promise<T>, message: string, ms = 15000): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error(message)), ms)),
    ]);
  };

  let connection: Awaited<ReturnType<typeof connectBrowserWallet>>;
  try {
    connection = await withTimeout(
      connectBrowserWallet(),
      "Wallet connection timed out. Open MetaMask or disable other wallet extensions, then try again.",
    );
  } catch (error) {
    throw new BrowserWalletPreBroadcastError(error instanceof Error ? error.message : "Wallet connection was not completed.");
  }
  const { adapter, connectedAddress, walletName, provider } = connection;
  if (!connectedAddress) {
    throw new BrowserWalletPreBroadcastError("Browser wallet connected without an account.");
  }
  if (input.expectedSender && connectedAddress.toLowerCase() !== input.expectedSender.toLowerCase()) {
    throw new BrowserWalletPreBroadcastError("The connected wallet account does not match the authenticated Web3 account.");
  }
  const kit = new AppKit();

  const sendParams: SendParams = {
    from: { adapter, chain: "Arc_Testnet" },
    to: getAddress(input.recipient),
    amount: input.amount,
    token: "USDC",
  };

  // Ensure Arc Testnet is registered in the wallet before attempting to switch/send.
  // wallet_addEthereumChain both adds the chain (if missing) and switches to it,
  // avoiding the "Unrecognized chain ID" error from wallet_switchEthereumChain.
  try {
    await addArcNetworkToWallet(provider as unknown as { request: (args: unknown) => Promise<unknown> });
  } catch {
    // Non-fatal: wallet may already have the chain or reject the prompt.
    // The send will still attempt and surface a clearer error if it fails.
  }

  try {
    await withTimeout(
      kit.estimateSend(sendParams),
      "Arc send estimate timed out. Confirm Arc Testnet is selected in MetaMask.",
    );
  } catch (error) {
    throw new BrowserWalletPreBroadcastError(error instanceof Error ? error.message : "Arc transaction could not be prepared.");
  }

  let result: Awaited<ReturnType<typeof kit.send>>;
  try {
    result = await withTimeout(
      kit.send(sendParams),
      "Wallet send timed out. Check wallet activity before retrying.",
      30000,
    );
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? (error as { code?: unknown }).code : undefined;
    if (code === 4001) {
      throw new BrowserWalletPreBroadcastError("Wallet request was rejected before a transaction was submitted.");
    }
    throw new BrowserWalletSubmissionUnknownError(error instanceof Error ? error.message : "Wallet submission outcome is unknown.");
  }

  if (result.state !== "success" || !("txHash" in result) || !result.txHash) {
    throw new BrowserWalletSubmissionUnknownError("Wallet did not return a transaction hash. Check wallet activity before retrying.");
  }

  return {
    connectedAddress,
    walletName,
    state: result.state,
    txHash: "txHash" in result ? result.txHash : undefined,
    explorerUrl: "explorerUrl" in result ? result.explorerUrl : undefined,
  };
}
