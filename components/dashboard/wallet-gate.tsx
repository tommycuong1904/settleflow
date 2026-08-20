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
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-5 py-3.5 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-cyan-200">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-cyan-400 shrink-0" />
          <span>
            Connected via{" "}
            <strong className="text-white font-medium">
              {authType === "web2_google"
                ? "Google Account"
                : authType === "web2_email"
                ? "Email Account"
                : "Web3 Wallet"}
            </strong>{" "}
            ({email || address}) on <span className="text-cyan-300 font-semibold">Arc Testnet</span>.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={disconnect}
            className="text-xs text-slate-400 hover:text-rose-300 underline underline-offset-4 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#0e172a]/95 to-[#090e1c]/95 p-6 md:p-8 shadow-[0_0_50px_rgba(34,211,238,0.08)]">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 -bottom-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            <Sparkles size={13} className="text-cyan-300" />
            Hybrid Web2.5 Milestone Escrow
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Connect your wallet or sign in with Email to unlock full payout operations.
          </h2>

          <p className="text-sm leading-relaxed text-slate-300">
            You are currently browsing in <strong className="text-cyan-200">Preview Mode</strong>. Sign in with Google, Email, or connect MetaMask to create new milestone payouts, release USDC, and verify Arc onchain proofs.
          </p>

          {/* Value Badges */}
          <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 border border-slate-700">
              <ShieldCheck size={14} className="text-cyan-400" /> Non-custodial Escrow
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 border border-slate-700">
              <Coins size={14} className="text-cyan-400" /> Instant Circle USDC
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 border border-slate-700">
              <Layers size={14} className="text-cyan-400" /> Arc Testnet Settlements
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
