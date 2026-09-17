"use client";

import React, { useState } from "react";
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useToast } from "@/lib/context/toast-context";
import { ARC_CONFIG } from "@/lib/arc/config";
import { shortenAddress } from "@/lib/utils/format";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";

interface ExportKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string | null;
  email: string | null;
  privateKey: string | null;
}

export function ExportKeyModal({
  isOpen,
  onClose,
  address,
  email,
  privateKey,
}: ExportKeyModalProps) {
  const { toast } = useToast();
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);

  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleCopyKey = async () => {
    if (!privateKey) return;
    try {
      await navigator.clipboard.writeText(privateKey);
      setHasCopied(true);
      toast({
        variant: "success",
        title: "Private Key Copied",
        description: "Key copied to clipboard. Never share it with anyone!",
      });
      setTimeout(() => setHasCopied(false), 3000);
    } catch {
      toast({
        variant: "error",
        title: "Copy Failed",
        description: "Please manually copy the private key.",
      });
    }
  };

  const handleClose = () => {
    setIsRevealed(false);
    setShowImportGuide(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-[500px] overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 sm:p-8 text-[var(--foreground)] space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--text-muted)] shrink-0">
            <KeyRound size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              Export Private Key
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Direct self-custody key for your Arc Smart Account
            </p>
          </div>
        </div>

        {/* Critical Security Warning */}
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 flex items-start gap-3 text-xs text-[var(--text-muted)]">
          <AlertTriangle size={18} className="text-[var(--foreground)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[var(--foreground)]">Never share your Private Key!</p>
            <p className="text-[11px] leading-relaxed">
              Anyone with this private key can withdraw all your USDC and take full control of your account. SettleFlow staff will NEVER ask for this key.
            </p>
          </div>
        </div>

        {/* Account Info */}
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 space-y-2 text-xs text-[var(--text-muted)]">
          <div className="flex items-center justify-between">
            <span>Linked Account:</span>
            <span className="font-medium text-[var(--foreground)]">{email || "Web2 Account"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Wallet Address:</span>
            <span className="font-mono text-[var(--accent-cyan)]">
              {address ? shortenAddress(address) : "N/A"}
            </span>
          </div>
        </div>

        {/* Private Key Display Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold uppercase tracking-wider text-[11px] text-[var(--text-muted)]">
              Ethereum Private Key (secp256k1)
            </label>
            <button
              type="button"
              onClick={() => setIsRevealed(!isRevealed)}
              className="flex items-center gap-1 text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors text-xs font-medium"
            >
              {isRevealed ? (
                <>
                  <EyeOff size={14} /> Hide Key
                </>
              ) : (
                <>
                  <Eye size={14} /> Reveal Key
                </>
              )}
            </button>
          </div>

          <div className="relative rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3.5 font-mono text-xs text-[var(--foreground)] break-all leading-relaxed select-all">
            {isRevealed ? (
              <span className="font-semibold">{privateKey}</span>
            ) : (
              <span className="text-[var(--text-muted)] tracking-widest font-sans">
                ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={handleCopyKey}
            disabled={!privateKey}
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[var(--foreground)] hover:bg-[var(--foreground)]/90 text-[var(--background)] py-2.5 px-4 text-xs font-semibold transition-all shadow-md active:scale-[0.99]"
          >
            {hasCopied ? (
              <>
                <Check size={14} /> Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy Private Key
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowImportGuide(!showImportGuide)}
            className="flex items-center justify-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] hover:bg-[var(--surface-strong)] text-[var(--text-muted)] hover:text-[var(--foreground)] py-2.5 px-4 text-xs font-medium transition-all"
          >
            <Wallet size={14} /> How to import into MetaMask
          </button>
        </div>

        {/* MetaMask / Rabby Import Guide Dropdown */}
        {showImportGuide && (
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 space-y-2.5 text-xs text-[var(--text-muted)] animate-in fade-in">
            <p className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[var(--accent-emerald)]" /> Steps to import into MetaMask / Rabby:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
              <li>Open your MetaMask or Rabby Wallet extension.</li>
              <li>Click on your Account list icon &gt; Select <strong className="text-[var(--foreground)]">&quot;Import Account&quot;</strong>.</li>
              <li>Paste the copied Private Key into the field &gt; Click <strong className="text-[var(--foreground)]">&quot;Import&quot;</strong>.</li>
              <li>Switch network to <strong className="text-[var(--foreground)]">Arc Testnet</strong> (Chain ID: <code className="text-[var(--accent-cyan)]">{ARC_CONFIG.chainId}</code>) to access your USDC funds directly!</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
