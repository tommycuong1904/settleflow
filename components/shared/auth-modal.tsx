"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/context/wallet-context";
import { useToast } from "@/lib/context/toast-context";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { discoverBrowserWallets, type EIP6963ProviderDetail } from "@/lib/arc/browser-wallet";
import { decodeGoogleJwt, loadGoogleGsiScript } from "@/lib/auth/google";
import { getPostSignInDestination } from "@/lib/auth/post-sign-in-destination";
import {
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authReturnTo,
    connectWeb3,
    connectGoogle,
    isConnecting,
  } = useWallet();
  const { toast } = useToast();
  const router = useRouter();
  const [detectedWallets, setDetectedWallets] = useState<EIP6963ProviderDetail[] | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(0);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

  const refreshCurrentPage = useCallback((needsPaymentAccountSetup = false) => {
    closeAuthModal();
    const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    const requestedDestination = authReturnTo ?? next;
    const destination = getPostSignInDestination(requestedDestination, needsPaymentAccountSetup);
    // `/auth-required` is a static sign-in boundary. Refreshing it after a
    // successful wallet session leaves the user on the same sign-in screen.
    router.replace(destination);
  }, [authReturnTo, closeAuthModal, router]);

  useEffect(() => {
    if (!isAuthModalOpen || !googleButtonRef.current) return;

    const updateGoogleButtonWidth = () => {
      const width = googleButtonRef.current?.getBoundingClientRect().width ?? 0;
      setGoogleButtonWidth(width > 0 ? Math.min(360, Math.floor(width)) : 0);
    };
    updateGoogleButtonWidth();
    const resizeObserver = new ResizeObserver(updateGoogleButtonWidth);
    resizeObserver.observe(googleButtonRef.current);
    return () => resizeObserver.disconnect();
  }, [isAuthModalOpen]);

  useEffect(() => {
    if (!isAuthModalOpen || !googleButtonRef.current) return;
    if (!googleClientId) return;
    if (!googleButtonWidth) return;

    let active = true;
    void loadGoogleGsiScript()
      .then(() => {
        if (!active || !window.google?.accounts || !googleButtonRef.current) return;
        setGoogleError(null);
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            void (async () => {
              const profile = decodeGoogleJwt(response.credential);
              if (!profile || profile.emailVerified === false) {
                setGoogleError("Google could not verify this account. Try another account.");
                return;
              }
              try {
                const needsPaymentAccountSetup = await connectGoogle({ ...profile, idToken: response.credential });
                refreshCurrentPage(needsPaymentAccountSetup);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Google sign-in failed. Please try again.";
                setGoogleError(message);
              }
            })();
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        googleButtonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: googleButtonWidth,
        });
      })
      .catch(() => {
        if (active) setGoogleError("Google sign-in is temporarily unavailable. Please try again later.");
      });

    return () => {
      active = false;
    };
  }, [connectGoogle, googleButtonWidth, googleClientId, isAuthModalOpen, refreshCurrentPage]);

  useScrollLock(isAuthModalOpen);

  if (!isAuthModalOpen) return null;

  const defaultWalletList = [
    { id: "MetaMask", label: "MetaMask", icon: "/wallets/metamask.svg", desc: "Browser extension or mobile app", rdnsMatch: "io.metamask" },
    { id: "Rabby Wallet", label: "Rabby Wallet", icon: "/wallets/rabby.svg", desc: "Game-changing Web3 experience", rdnsMatch: "io.rabby" },
    { id: "OKX Wallet", label: "OKX Wallet", icon: "/wallets/okx.svg", desc: "Browser extension or mobile app", rdnsMatch: "com.okex.wallet" },
    { id: "Coinbase Smart Wallet", label: "Coinbase / Passkey", icon: "/wallets/coinbase.svg", desc: "FaceID & biometric smart account", rdnsMatch: "com.coinbase.wallet" },
    { id: "WalletConnect", label: "WalletConnect", icon: "/wallets/walletconnect.svg", desc: "Scan QR with 300+ mobile wallets", rdnsMatch: "walletconnect" },
  ];

  const allWalletItems = (detectedWallets ?? []).map((detected) => {
    const knownWallet = defaultWalletList.find(
      (wallet) =>
        (detected.info.rdns && wallet.rdnsMatch && detected.info.rdns.toLowerCase().includes(wallet.rdnsMatch.toLowerCase())) ||
        detected.info.name.toLowerCase().includes(wallet.id.toLowerCase()) ||
        wallet.id.toLowerCase().includes(detected.info.name.toLowerCase()),
    );
    return {
      id: detected.info.name,
      label: knownWallet?.label ?? detected.info.name,
      icon: detected.info.icon?.trim() || knownWallet?.icon || "/wallets/metamask.svg",
      desc: knownWallet?.desc ?? "Detected browser extension",
      isDetected: true,
    };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in sm:p-4"
      onClick={closeAuthModal}
    >
      <div
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[calc(100vw-1.5rem)] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-[460px] sm:p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
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
          <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Sign in to SettleFlow
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Use your Google account to access your workspace. A browser wallet is only needed for Wallet payment.
          </p>
        </div>

        <section className="min-w-0 space-y-2.5">
          <div ref={googleButtonRef} className="flex min-h-11 min-w-0 w-full items-center justify-center overflow-hidden rounded-lg" aria-label="Google sign-in" />
          {googleError || !googleClientId ? <p role="alert" className="text-center text-xs text-rose-600">{googleError ?? "Google sign-in is not configured for this environment."}</p> : null}
        </section>

        <details className="mt-6 border-t border-[var(--border-soft)] pt-5">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)]">Use a browser wallet instead</summary>
          <div className="mt-4 space-y-2.5">
            {detectedWallets === null ? (
              <p className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-5 text-center text-xs text-[var(--text-muted)]">Looking for browser wallets…</p>
            ) : allWalletItems.length === 0 ? (
              <p className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-5 text-center text-xs leading-5 text-[var(--text-muted)]">No browser wallet was found. Install or unlock an EVM-compatible browser wallet, then reopen this dialog.</p>
            ) : allWalletItems.map((w) => (
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
                    {/* Wallet extension icons are runtime-provided data URLs. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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

            <details className="pt-2">
              <summary className="cursor-pointer text-center text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--foreground)]">
                Need to add Arc Testnet?
              </summary>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { addArcNetworkToWallet } = await import("@/lib/arc/onchain");
                    await addArcNetworkToWallet();
                  } catch {}
                }}
                className="mt-2 w-full py-2 px-3 rounded-full border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] hover:bg-[var(--surface-strong)] text-[var(--text-muted)] hover:text-[var(--foreground)] text-[11px] font-medium transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>🌐 Add or switch to Arc Testnet</span>
              </button>
            </details>
          </div>
        </details>

      </div>
    </div>
  );
}
