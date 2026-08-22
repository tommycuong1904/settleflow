"use client";

import React from "react";
import { Button } from "@/components/shared/button";
import { useWallet } from "@/lib/context/wallet-context";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Lock,
  Layers,
  Coins,
  CheckCircle2,
} from "lucide-react";

export function WalletGate() {
  const { isConnected, openAuthModal, authType, email, address, disconnect } =
    useWallet();

  if (isConnected) {
    // Show connected notification / quick banner if needed, or null
    return (
      <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-3.5 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-200">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>
            Connected via{" "}
            <strong className="text-white font-medium">
              {authType === "web2_google"
                ? "Google Account"
                : authType === "web2_email"
                ? "Email Account"
                : "Web3 Wallet"}
            </strong>{" "}
            ({email || address}) on <span className="text-emerald-400 font-medium">Arc Testnet</span>.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={disconnect}
            className="text-xs text-slate-500 hover:text-rose-300 underline underline-offset-4 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 md:p-8">
      {/* Subtle top ambient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            <Sparkles size={13} className="text-slate-400" />
            Hybrid Web2.5 Milestone Escrow
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Connect your wallet or sign in with Email to unlock full payout operations.
          </h2>

          <p className="text-sm leading-relaxed text-slate-400">
            You are currently browsing in <strong className="text-white">Preview Mode</strong>. Sign in with Google, Email, or connect MetaMask to create new milestone payouts, release USDC, and verify Arc onchain proofs.
          </p>

          {/* Value Badges */}
          <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 border border-white/10">
              <ShieldCheck size={14} className="text-slate-400" /> Non-custodial Escrow
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 border border-white/10">
              <Coins size={14} className="text-slate-400" /> Instant Circle USDC
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 border border-white/10">
              <Layers size={14} className="text-slate-400" /> Arc Testnet Settlements
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto shrink-0">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={openAuthModal}
            className="w-full sm:w-auto"
            icon={<Lock size={16} />}
          >
            Sign In / Connect Wallet <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
