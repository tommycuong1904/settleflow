"use client";

import React from "react";
import { Button } from "@/components/shared/button";
import { useWallet } from "@/lib/context/wallet-context";
import {
  Sparkles,
  ArrowRight,
  Lock,
} from "lucide-react";

export function WalletGate() {
  const { isConnected, openAuthModal } = useWallet();

  if (isConnected) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 md:p-8">
      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <Sparkles size={13} className="text-[var(--text-muted)]" />
            Web3 milestone payouts
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Connect your Web3 wallet to unlock payout operations.
          </h2>

          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            Connect your wallet to create payouts, submit work, approve milestones, and release payments.
          </p>
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
