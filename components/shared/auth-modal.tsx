"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/context/wallet-context";
import { useToast } from "@/lib/context/toast-context";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { discoverBrowserWallets, type EIP6963ProviderDetail } from "@/lib/arc/browser-wallet";
import {
  X,
  Mail,
  Wallet,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    connectWeb3,
    isConnecting,
  } = useWallet();
  const { toast } = useToast();
  const router = useRouter();
  const [detectedWallets, setDetectedWallets] = useState<EIP6963ProviderDetail[]>([]);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    let active = true;
    discoverBrowserWallets()
      .then((wallets) => {
        if (active) setDetectedWallets(wallets);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isAuthModalOpen]);

  const refreshCurrentPage = () => {
    closeAuthModal();
    const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    // `/auth-required` is a static sign-in boundary. Refreshing it after a
    // successful wallet session leaves the user on the same sign-in screen.
    router.replace(destination);
  };

  useScrollLock(isAuthModalOpen);

  if (!isAuthModalOpen) return null;

  const defaultWalletList = [
    { id: "MetaMask", label: "MetaMask", icon: "/wallets/metamask.svg", desc: "Browser extension or mobile app", rdnsMatch: "io.metamask" },
    { id: "Rabby Wallet", label: "Rabby Wallet", icon: "/wallets/rabby.svg", desc: "Game-changing Web3 experience", rdnsMatch: "io.rabby" },
    { id: "OKX Wallet", label: "OKX Wallet", icon: "/wallets/okx.svg", desc: "Browser extension or mobile app", rdnsMatch: "com.okex.wallet" },
    { id: "Coinbase Smart Wallet", label: "Coinbase / Passkey", icon: "/wallets/coinbase.svg", desc: "FaceID & biometric smart account", rdnsMatch: "com.coinbase.wallet" },
    { id: "WalletConnect", label: "WalletConnect", icon: "/wallets/walletconnect.svg", desc: "Scan QR with 300+ mobile wallets", rdnsMatch: "walletconnect" },
  ];

  // Merge detected EIP-6963 wallet extension app icons into list
  const walletItems = defaultWalletList.map((w) => {
    const detected = detectedWallets.find(
      (d) =>
        (d.info.rdns && w.rdnsMatch && d.info.rdns.toLowerCase().includes(w.rdnsMatch.toLowerCase())) ||
        d.info.name.toLowerCase().includes(w.id.toLowerCase()) ||
        w.id.toLowerCase().includes(d.info.name.toLowerCase())
    );
    return {
      ...w,
      icon: detected?.info.icon && detected.info.icon.trim().length > 0 ? detected.info.icon : w.icon,
      isDetected: Boolean(detected),
    };
  });

  const extraWallets = detectedWallets
    .filter(
      (d) =>
        !defaultWalletList.some(
          (w) =>
            (d.info.rdns && w.rdnsMatch && d.info.rdns.toLowerCase().includes(w.rdnsMatch.toLowerCase())) ||
            d.info.name.toLowerCase().includes(w.id.toLowerCase()) ||
            w.id.toLowerCase().includes(d.info.name.toLowerCase())
        )
    )
    .map((d) => ({
      id: d.info.name,
      label: d.info.name,
      icon: d.info.icon || "/wallets/metamask.svg",
      desc: "Detected browser extension",
      isDetected: true,
    }));

  const allWalletItems = [...walletItems, ...extraWallets];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          disabled={isConnecting}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--foreground)]">
            <Sparkles size={22} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Sign in to SettleFlow
          </h2>
        </div>

        <div className="mb-5 flex rounded-xl bg-[var(--surface-muted)] p-1 border border-[var(--border-soft)] text-xs font-medium">
          <button
            type="button"
            disabled
            aria-label="Web2 sign-in is coming soon"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[var(--text-muted)] opacity-55 cursor-not-allowed"
          >
            <Mail size={14} /> Web2 Sign-in <span className="text-[10px]">Coming soon</span>
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--foreground)] py-2 font-semibold text-[var(--background)] shadow-sm"
          >
            <Wallet size={14} /> Connect Web3 Wallet
          </button>
        </div>

        <div className="space-y-2.5">
            {allWalletItems.map((w) => (
              <button
                key={w.id}
                onClick={async () => {
                  try {
                    await connectWeb3(w.id);
                    refreshCurrentPage();
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : "Wallet sign-in failed. Please try again.";
                    toast({ variant: "error", title: "Wallet Sign-In", description: message });
                  }
                }}
                disabled={isConnecting}
                className="w-full flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)] transition-all group disabled:opacity-50 text-left"
              >
                <div className="flex items-center gap-3.5">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-1.5 text-[var(--foreground)] shadow-xs">
                    <img
                      src={w.icon}
                      alt={w.label}
                      className="h-8 w-8 object-contain rounded-md"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/wallets/metamask.svg";
                      }}
                    />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {w.label}
                      </p>
                      {w.isDetected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={10} /> Installed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {w.desc}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--foreground)] transition-colors font-medium">
                  Connect →
                </span>
              </button>
            ))}

            {/* Quick Add Network Helper */}
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { addArcNetworkToWallet } = await import("@/lib/arc/onchain");
                    await addArcNetworkToWallet();
                  } catch {}
                }}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] hover:bg-[var(--surface-strong)] text-[var(--text-muted)] hover:text-[var(--foreground)] text-[11px] font-medium transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>🌐 Add / Switch Arc Testnet RPC in MetaMask</span>
              </button>
            </div>
        </div>

      </div>
    </div>
  );
}
