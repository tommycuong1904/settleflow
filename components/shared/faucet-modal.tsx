"use client";

import React, { useState } from "react";
import { Button } from "@/components/shared/button";
import { ARC_CONFIG } from "@/lib/arc/config";
import { addArcNetworkToWallet } from "@/lib/arc/onchain";
import { shortenAddress } from "@/lib/utils/format";
import {
  X,
  ExternalLink,
  Coins,
  Copy,
  Check,
  Plus,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/lib/context/toast-context";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";

type FaucetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userAddress?: string | null;
};

export function FaucetModal({ isOpen, onClose, userAddress }: FaucetModalProps) {
  const { toast } = useToast();

  useScrollLock(isOpen);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [addingNetwork, setAddingNetwork] = useState(false);
  const [networkNotice, setNetworkNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({
      variant: "success",
      title: "Copied to Clipboard",
      description: `${label} copied successfully.`,
      durationMs: 2500,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddNetwork = async () => {
    setAddingNetwork(true);
    setNetworkNotice(null);
    try {
      await addArcNetworkToWallet();
      toast({
        variant: "success",
        title: "Network Added",
        description: "Arc Testnet has been added to your wallet.",
      });
      setNetworkNotice({
        type: "success",
        message: "Arc Testnet added to your wallet successfully!",
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to add Arc Testnet. Please add it manually.";
      toast({
        variant: "error",
        title: "Network Error",
        description: errorMsg,
      });
      setNetworkNotice({
        type: "error",
        message: errorMsg,
      });
    } finally {
      setAddingNetwork(false);
    }
  };

  const faucetUrl = userAddress
    ? `https://faucet.circle.com/?address=${userAddress}`
    : "https://faucet.circle.com/";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl text-[var(--foreground)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              Arc Testnet Faucet & Setup
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Get free testnet USDC to fund milestone escrows and simulate onchain payouts.
            </p>
          </div>
        </div>

        {networkNotice && (
          <div
            className={`mb-4 rounded-xl border p-3 text-xs flex items-center gap-2 ${
              networkNotice.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {networkNotice.type === "success" ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
            )}
            <span>{networkNotice.message}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Faucet Claim Section */}
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <Sparkles size={15} className="text-[var(--accent-cyan)]" /> Official Circle Faucet
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  Request 10 to 50 testnet USDC sent directly to your connected wallet.
                </p>
              </div>
            </div>

            <Button
              href={faucetUrl}
              variant="primary"
              size="md"
              className="w-full"
              icon={<ExternalLink size={13} className="order-last" />}
            >
              Open Circle Faucet
            </Button>
          </div>

          {/* 1-Click Add Network Button */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleAddNetwork}
            disabled={addingNetwork}
            className="w-full"
            icon={<Plus size={14} className="text-cyan-400" />}
          >
            {addingNetwork
              ? "Adding to Wallet..."
              : "Add Arc Testnet to MetaMask / Rabby"}
          </Button>

          {/* Network Parameter Reference */}
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 space-y-2.5 text-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Manual RPC Details
            </p>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Network Name:</span>
                <span className="text-white font-medium">Arc Testnet</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">RPC URL:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 truncate max-w-[180px]">
                    {ARC_CONFIG.rpcUrl}
                  </span>
                  <button
                    onClick={() => handleCopy("rpc", ARC_CONFIG.rpcUrl, "RPC URL")}
                    className="text-slate-400 hover:text-cyan-300"
                  >
                    {copiedKey === "rpc" ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Chain ID:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300">{ARC_CONFIG.chainId}</span>
                  <button
                    onClick={() =>
                      handleCopy("chainId", ARC_CONFIG.chainId.toString(), "Chain ID")
                    }
                    className="text-slate-400 hover:text-cyan-300"
                  >
                    {copiedKey === "chainId" ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Currency Symbol:</span>
                <span className="text-emerald-400">USDC</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Block Explorer:</span>
                <a
                  href={ARC_CONFIG.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Arcscan <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
