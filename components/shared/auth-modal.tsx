"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@/lib/context/wallet-context";
import { promptGoogleOAuth, loadGoogleGsiScript, type GoogleUserProfile } from "@/lib/auth/google";
import { useToast } from "@/lib/context/toast-context";
import {
  X,
  Mail,
  ArrowRight,
  ShieldCheck,
  Wallet,
  Sparkles,
  Loader2,
  CheckCircle2,
  KeyRound,
  AlertCircle,
} from "lucide-react";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    connectWeb3,
    connectWeb2,
    connectGoogle,
    isConnecting,
  } = useWallet();
  const { toast } = useToast();

  const [emailInput, setEmailInput] = useState("");
  const [activeTab, setActiveTab] = useState<"quick" | "web3">("quick");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showConfigPrompt, setShowConfigPrompt] = useState(false);
  const [customClientId, setCustomClientId] = useState("");

  useEffect(() => {
    if (isAuthModalOpen) {
      void loadGoogleGsiScript().catch(() => {});
      const storedClientId = typeof window !== "undefined" ? localStorage.getItem("settleflow_google_client_id") || "" : "";
      if (storedClientId) {
        setCustomClientId(storedClientId);
      }
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    connectWeb2(emailInput.trim(), "email");
  };

  const getEffectiveClientId = () => {
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || customClientId || "";
  };

  const handleGoogleSignIn = async () => {
    const clientId = getEffectiveClientId();

    if (!clientId) {
      setShowConfigPrompt(true);
      return;
    }

    setGoogleLoading(true);
    try {
      const profile: GoogleUserProfile = await promptGoogleOAuth(clientId);
      await connectGoogle(profile);
      toast({
        variant: "success",
        title: "Signed in with Google",
        description: `Welcome ${profile.name || profile.email}! Smart Account active.`,
      });
      closeAuthModal();
    } catch (err: unknown) {
      console.error("Google Auth error:", err);
      const errorMessage = err instanceof Error ? err.message : "Google authentication was cancelled or failed.";
      
      // If client ID is invalid or not found
      if (errorMessage.includes("client_id") || errorMessage.includes("not found") || errorMessage.includes("origin")) {
        setShowConfigPrompt(true);
      } else if (!errorMessage.includes("popup_closed")) {
        toast({
          variant: "error",
          title: "Google Sign-In",
          description: errorMessage,
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSaveCustomClientId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customClientId.trim()) return;
    localStorage.setItem("settleflow_google_client_id", customClientId.trim());
    toast({
      variant: "success",
      title: "Google Client ID Saved",
      description: "Now click Continue with Google to authenticate.",
    });
    setShowConfigPrompt(false);
    void handleGoogleSignIn();
  };

  const handleDemoGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await connectGoogle({
        email: "alex.turner@gmail.com",
        name: "Alex Turner",
        sub: "google-oauth2-1082938475928374",
        picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      });
      toast({
        variant: "success",
        title: "Demo Google Account Connected",
        description: "Logged in as alex.turner@gmail.com with Arc Smart Account.",
      });
      closeAuthModal();
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-[460px] overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#0c1322] p-6 sm:p-8 shadow-[0_0_60px_rgba(34,211,238,0.12)] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          disabled={isConnecting || googleLoading}
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Sign in to SettleFlow
          </h2>
          <p className="mt-1.5 text-xs text-slate-400 max-w-[320px] mx-auto leading-relaxed">
            Access your milestone escrows, payout approvals, and smart settlement records.
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="mb-5 flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 text-xs font-medium">
          <button
            onClick={() => { setActiveTab("quick"); setShowConfigPrompt(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              activeTab === "quick"
                ? "bg-cyan-400 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail size={14} /> Web2 (Social / Email)
          </button>
          <button
            onClick={() => { setActiveTab("web3"); setShowConfigPrompt(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              activeTab === "web3"
                ? "bg-cyan-400 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Wallet size={14} /> Web3 Wallet
          </button>
        </div>

        {/* Tab 1: Web2 / Social & Email */}
        {activeTab === "quick" && (
          <div className="space-y-4">
            {/* Optional Google Client ID Config In-Modal View */}
            {showConfigPrompt ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3 text-xs text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Google OAuth Client ID</p>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      To open your real Google sign-in window, provide your Google Cloud OAuth Client ID (or configure <code className="font-mono text-cyan-300">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in <code className="font-mono text-cyan-300">.env</code>).
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveCustomClientId} className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!customClientId.trim()}
                      className="flex-1 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 py-2 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      Save & Sign In
                    </button>
                    <button
                      type="button"
                      onClick={handleDemoGoogleSignIn}
                      className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white px-3 py-2 text-xs font-medium transition-all"
                    >
                      Use Demo Profile
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={() => setShowConfigPrompt(false)}
                  className="text-[11px] text-slate-400 hover:text-white underline text-center w-full block pt-1"
                >
                  ← Back to standard login
                </button>
              </div>
            ) : (
              <>
                {/* Google Sign In Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isConnecting || googleLoading}
                  className="w-full flex items-center justify-center gap-3 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-700/90 py-3 px-4 text-sm font-normal text-white transition-all hover:border-cyan-500/40 disabled:opacity-60 group shadow-sm"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.7 0 3 .7 3.9 1.6l2.9-2.9C17 2 14.7 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.9 7.2C.7 9.6 0 12.2 0 15s.7 5.4 1.9 7.8l3.7-2.9c-.3-.7-.5-1.5-.5-2.2z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 15.9C3.7 19.7 7.5 23 12 23z"
                    />
                  </svg>
                  {googleLoading ? (
                    <span className="flex items-center gap-2 text-cyan-200">
                      <Loader2 size={16} className="animate-spin text-cyan-400" /> Connecting with Google...
                    </span>
                  ) : (
                    <span className="group-hover:text-cyan-200 transition-colors">
                      Continue with Google
                    </span>
                  )}
                </button>

                <div className="relative flex items-center justify-center my-4">
                  <div className="w-full border-t border-slate-800" />
                  <span className="bg-[#0c1322] px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Or with email
                  </span>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full rounded-full border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isConnecting || googleLoading || !emailInput.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-cyan-400 hover:bg-cyan-300 py-2.5 px-4 text-sm font-normal text-slate-950 transition-all disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Creating session...
                      </>
                    ) : (
                      <>
                        Continue with Email <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Web3 Wallets */}
        {activeTab === "web3" && (
          <div className="space-y-2.5">
            {/* MetaMask */}
            <button
              onClick={() => connectWeb3("MetaMask")}
              disabled={isConnecting}
              className="w-full flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 hover:border-cyan-500/40 hover:bg-slate-800/80 transition-all group disabled:opacity-50 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🦊</span>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-cyan-200">
                    MetaMask
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Browser extension or mobile app
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-cyan-300">
                Connect →
              </span>
            </button>

            {/* Rabby Wallet */}
            <button
              onClick={() => connectWeb3("Rabby Wallet")}
              disabled={isConnecting}
              className="w-full flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 hover:border-cyan-500/40 hover:bg-slate-800/80 transition-all group disabled:opacity-50 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🐰</span>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-cyan-200">
                    Rabby Wallet
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Game-changing Web3 experience
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-cyan-300">
                Connect →
              </span>
            </button>

            {/* Coinbase Smart Wallet */}
            <button
              onClick={() => connectWeb3("Coinbase Smart Wallet")}
              disabled={isConnecting}
              className="w-full flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 hover:border-cyan-500/40 hover:bg-slate-800/80 transition-all group disabled:opacity-50 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🛡️</span>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-cyan-200">
                    Coinbase / Passkey
                  </p>
                  <p className="text-[11px] text-slate-400">
                    FaceID & biometric smart account
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-cyan-300">
                Connect →
              </span>
            </button>

            {/* WalletConnect */}
            <button
              onClick={() => connectWeb3("WalletConnect")}
              disabled={isConnecting}
              className="w-full flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 hover:border-cyan-500/40 hover:bg-slate-800/80 transition-all group disabled:opacity-50 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔗</span>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-cyan-200">
                    WalletConnect
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Scan QR with 300+ mobile wallets
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-cyan-300">
                Connect →
              </span>
            </button>

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
                className="w-full py-2 px-3 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 text-[11px] font-medium transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>🌐 Add / Switch Arc Testnet RPC in MetaMask</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info banner */}
        <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/30 p-3.5 text-xs text-cyan-200 flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] text-slate-300">
            <strong className="text-cyan-300 font-semibold">New to Web3?</strong> Signing in with Google/Email automatically provisions a non-custodial Smart Account on Arc Testnet.
          </p>
        </div>
      </div>
    </div>
  );
}
