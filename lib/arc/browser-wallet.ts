"use client";

import { AppKit, type SendParams } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { getAddress, type EIP1193Provider } from "viem";

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

async function discoverBrowserWallets(): Promise<EIP6963ProviderDetail[]> {
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

export async function connectBrowserWallet() {
  const providers = await discoverBrowserWallets();
  const selectedWallet =
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
  };
}

export async function sendUsdcWithBrowserWallet(input: {
  recipient: string;
  amount: string;
}) {
  const withTimeout = async <T,>(promise: Promise<T>, message: string, ms = 15000): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error(message)), ms)),
    ]);
  };

  const { adapter, connectedAddress, walletName } = await withTimeout(
    connectBrowserWallet(),
    "Wallet connection timed out. Open MetaMask or disable other wallet extensions, then try again.",
  );
  const kit = new AppKit();

  const sendParams: SendParams = {
    from: { adapter, chain: "Arc_Testnet" },
    to: getAddress(input.recipient),
    amount: input.amount,
    token: "USDC",
  };

  await withTimeout(
    kit.estimateSend(sendParams),
    "Arc send estimate timed out. Confirm Arc Testnet is selected in MetaMask.",
  );
  const result = await withTimeout(
    kit.send(sendParams),
    "Wallet send timed out. Approve the MetaMask popup or retry after reopening the extension.",
    30000,
  );

  return {
    connectedAddress,
    walletName,
    state: result.state,
    txHash: "txHash" in result ? result.txHash : undefined,
    explorerUrl: "explorerUrl" in result ? result.explorerUrl : undefined,
  };
}
