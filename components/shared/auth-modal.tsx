"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/context/wallet-context";
import { useToast } from "@/lib/context/toast-context";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { decodeGoogleJwt, loadGoogleGsiScript } from "@/lib/auth/google";
import {
  X,
  Mail,
  ShieldCheck,
  Wallet,
  Sparkles,
  Loader2,
} from "lucide-react";

type GoogleCredentialResponse = { credential: string };

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    connectWeb3,
    connectGoogle,
    isConnecting,
  } = useWallet();
  const { toast } = useToast();
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitializedRef = useRef(false);


  const refreshCurrentPage = () => {
    closeAuthModal();
    const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    if (next) router.replace(destination);
    else router.refresh();
  };

  const [activeTab, setActiveTab] = useState<"quick" | "web3">("quick");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  const getPostSignInDestination = useCallback(() => {
    if (typeof window === "undefined") return "/dashboard";
    const url = new URL(window.location.href);
    const next = url.searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    if (url.pathname === "/accept-invite" && url.searchParams.get("token")) return `${url.pathname}${url.search}`;
    return "/dashboard";
  }, []);

  useScrollLock(isAuthModalOpen);

  const finishGoogleSignIn = useCallback(async (response: GoogleCredentialResponse) => {
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const profile = decodeGoogleJwt(response.credential);
      if (!profile) throw new Error("Google did not return a valid sign-in credential.");
      await connectGoogle({ ...profile, idToken: response.credential });
      router.replace(getPostSignInDestination());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Google authentication was cancelled or failed.";
      setGoogleError(errorMessage);
      toast({ variant: "error", title: "Google Sign-In", description: errorMessage });
    } finally {
      setGoogleLoading(false);
    }
  }, [connectGoogle, getPostSignInDestination, router, toast]);

  useEffect(() => {
    if (!isAuthModalOpen || googleScriptLoaded) return;
    let cancelled = false;
    void loadGoogleGsiScript()
      .then(() => {
        if (!cancelled) setGoogleScriptLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setGoogleError("Google sign-in could not load. Try again or use the redirect fallback.");
      });
    return () => {
      cancelled = true;
    };
  }, [googleScriptLoaded, isAuthModalOpen]);

  useEffect(() => {
    if (!googleScriptLoaded || !googleClientId || !window.google || googleInitializedRef.current) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => void finishGoogleSignIn(response),
    });
    googleInitializedRef.current = true;
  }, [finishGoogleSignIn, googleClientId, googleScriptLoaded]);

  useEffect(() => {
    if (activeTab !== "quick" || !isAuthModalOpen || !googleScriptLoaded || !googleButtonRef.current || !window.google) return;
    const button = googleButtonRef.current;
    button.replaceChildren();
    window.google.accounts.id.renderButton(button, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 360,
    });
  }, [activeTab, googleScriptLoaded, isAuthModalOpen]);

  const handleGoogleRedirectFallback = () => {
    window.location.assign(`/api/v1/auth/google/start?next=${encodeURIComponent(getPostSignInDestination())}`);
  };

  if (!isAuthModalOpen) return null;

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
          disabled={isConnecting || googleLoading}
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
          <p className="mt-1.5 text-xs text-[var(--text-muted)] max-w-[320px] mx-auto leading-relaxed">
            Access your milestone escrows, payout approvals, and smart settlement records.
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="mb-5 flex rounded-xl bg-[var(--surface-muted)] p-1 border border-[var(--border-soft)] text-xs font-medium">
          <button
            onClick={() => setActiveTab("quick")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              activeTab === "quick"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Mail size={14} /> Web2 (Social / Email)
          </button>
          <button
            onClick={() => setActiveTab("web3")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              activeTab === "web3"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Wallet size={14} /> Web3 Wallet
          </button>
        </div>

        {/* Tab 1: Web2 / Social & Email */}
        {activeTab === "quick" && (
          <div className="space-y-4">
            <div className={googleLoading || isConnecting ? "pointer-events-none opacity-60" : undefined}>
              {googleClientId ? <div ref={googleButtonRef} className="flex min-h-11 justify-center" /> : null}
              {!googleScriptLoaded && !googleError ? (
                <div className="flex min-h-11 items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
                  <Loader2 size={16} className="animate-spin" /> Loading Google sign-in...
                </div>
              ) : null}
            </div>
            {googleError ? <p className="text-center text-xs text-rose-600">{googleError}</p> : null}
            <button
              type="button"
              onClick={handleGoogleRedirectFallback}
              disabled={googleLoading || isConnecting}
              className="w-full text-center text-xs text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--foreground)] disabled:opacity-60"
            >
              Use Google sign-in in a new page instead
            </button>
            <p className="text-center text-xs leading-relaxed text-[var(--text-muted)]">
              Sign in with Google or a provisioned wallet. Email-only sign-in is unavailable.
            </p>
          </div>
        )}

        {/* Tab 2: Web3 Wallets */}
        {activeTab === "web3" && (
          <div className="space-y-2.5">
            {[
              { id: "MetaMask", label: "MetaMask", emoji: "🦊", desc: "Browser extension or mobile app" },
              { id: "Rabby Wallet", label: "Rabby Wallet", emoji: "🐰", desc: "Game-changing Web3 experience" },
              { id: "Coinbase Smart Wallet", label: "Coinbase / Passkey", emoji: "🛡️", desc: "FaceID & biometric smart account" },
              { id: "WalletConnect", label: "WalletConnect", emoji: "🔗", desc: "Scan QR with 300+ mobile wallets" },
            ].map((w) => (
              <button
                key={w.id}
                onClick={async () => {
                  await connectWeb3(w.id);
                  refreshCurrentPage();
                }}
                disabled={isConnecting}
                className="w-full flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)] transition-all group disabled:opacity-50 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{w.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {w.label}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {w.desc}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--foreground)] transition-colors">
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
        )}

        {/* Footer info banner */}
        <div className="mt-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3.5 text-xs flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] text-[var(--text-muted)]">
            <strong className="text-[var(--foreground)] font-semibold">New to Web3?</strong> Signing in with Google/Email automatically provisions a non-custodial Smart Account on Arc Testnet.
          </p>
        </div>
      </div>
    </div>
  );
}
