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
  ExternalLink,
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
        className="relative w-full max-w-[500px] overflow-hidden rounded-3xl border border-rose-500/30 bg-[#0c1322] p-6 sm:p-8 shadow-[0_0_60px_rgba(244,63,94,0.15)] text-white space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <KeyRound size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Export Private Key
            </h2>
            <p className="text-xs text-slate-400">
              Direct self-custody key for your Arc Smart Account
            </p>
          </div>
        </div>

        {/* Critical Security Warning */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 flex items-start gap-3 text-xs text-rose-200">
          <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-100">Never share your Private Key!</p>
            <p className="text-[11px] text-rose-200/90 leading-relaxed">
              Anyone with this private key can withdraw all your USDC and take full control of your account. SettleFlow staff will NEVER ask for this key.
            </p>
          </div>
        </div>

        {/* Account Info */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Linked Account:</span>
            <span className="font-medium text-white">{email || "Web2 Account"}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Wallet Address:</span>
            <span className="font-mono text-cyan-300">
              {address ? shortenAddress(address) : "N/A"}
            </span>
          </div>
        </div>

        {/* Private Key Display Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <label className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
              Ethereum Private Key (secp256k1)
            </label>
            <button
              type="button"
              onClick={() => setIsRevealed(!isRevealed)}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors text-xs font-medium"
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

          <div className="relative rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5 font-mono text-xs text-slate-200 break-all leading-relaxed select-all">
            {isRevealed ? (
              <span className="text-rose-200 font-semibold">{privateKey}</span>
            ) : (
              <span className="text-slate-500 tracking-widest font-sans">
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
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 py-2.5 px-4 text-xs font-semibold transition-all shadow-md active:scale-[0.99]"
          >
            {hasCopied ? (
              <>
                <Check size={14} className="text-slate-950" /> Copied to Clipboard!
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
            className="flex items-center justify-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 py-2.5 px-4 text-xs font-medium transition-all"
          >
            <Wallet size={14} /> How to import into MetaMask
          </button>
        </div>

        {/* MetaMask / Rabby Import Guide Dropdown */}
        {showImportGuide && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2.5 text-xs text-slate-300 animate-in fade-in">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" /> Steps to import into MetaMask / Rabby:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 leading-relaxed">
              <li>Open your MetaMask or Rabby Wallet extension.</li>
              <li>Click on your Account list icon &gt; Select <strong>"Import Account"</strong>.</li>
              <li>Paste the copied Private Key into the field &gt; Click <strong>"Import"</strong>.</li>
              <li>Switch network to <strong>Arc Testnet</strong> (Chain ID: <code className="text-cyan-300">{ARC_CONFIG.chainId}</code>) to access your USDC funds directly!</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
