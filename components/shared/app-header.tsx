"use client";

import React, { useState } from "react";
import { Button } from "@/components/shared/button";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { FaucetModal } from "@/components/shared/faucet-modal";
import { useWallet } from "@/lib/context/wallet-context";
import { addArcNetworkToWallet } from "@/lib/arc/onchain";
import { useToast } from "@/lib/context/toast-context";
import { ExternalLink, LogOut, Wallet, User, ChevronDown, RefreshCw, Droplets } from "lucide-react";

export function AppHeader() {
  const {
    isConnected,
    isConnecting,
    address,
    email,
    authType,
    network,
    usdcBalance,
    isRefreshingBalance,
    openAuthModal,
    disconnect,
    refreshBalance,
  } = useWallet();

  const { toast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);

  const handleAddArcNetwork = async () => {
    try {
      await addArcNetworkToWallet();
      toast({
        variant: "success",
        title: "Arc Testnet Active",
        description: "Arc Testnet was successfully added/selected in your wallet.",
      });
    } catch (err: unknown) {
      const errorObj = err as { code?: number; message?: string } | undefined;
      if (errorObj?.code !== 4001) {
        toast({
          variant: "warning",
          title: "Network Switch",
          description: errorObj?.message || "Please make sure your Web3 wallet extension is unlocked.",
        });
      }
    }
  };

  const displayIdentifier = email
    ? email.split("@")[0]
    : address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Connected";

  return (
    <div className="sf-app-header relative flex flex-wrap items-center gap-3">
      {/* Role Switcher */}
      <RoleSwitcher />

      {/* Get test USDC — opens faucet modal */}
      <Button variant="ghost" onClick={() => setIsFaucetOpen(true)}>
        <Droplets size={13} className="mr-1 text-cyan-400" /> Get test USDC
      </Button>

      {/* Network indicator with 1-click Add/Switch Arc Testnet */}
      <button
        onClick={handleAddArcNetwork}
        title="Click to add / switch to Arc Testnet in your Web3 wallet"
        className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 hover:bg-slate-800 hover:border-cyan-500/40 transition-all px-3.5 py-2 text-xs text-slate-300"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
        <span>{network}</span>
      </button>

      {/* Auth state button */}
      {!isConnected ? (
        <Button onClick={openAuthModal} disabled={isConnecting} variant="primary">
          {isConnecting ? "Connecting..." : "Sign In / Connect"}
        </Button>
      ) : (
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-slate-900/90 px-4 py-2 text-xs font-normal text-cyan-200 hover:border-cyan-400 hover:bg-slate-800 transition-all shadow-sm"
          >
            {authType === "web2_google" || authType === "web2_email" ? (
              <User size={13} className="text-cyan-400" />
            ) : (
              <Wallet size={13} className="text-cyan-400" />
            )}
            <span className="font-medium text-white">{displayIdentifier}</span>
            <span className="text-slate-500 font-mono">|</span>
            <span className="text-cyan-300">{usdcBalance} USDC</span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {/* Account Dropdown */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-slate-800 bg-[#0c1322] p-3 shadow-2xl text-xs space-y-2.5">
                <div className="border-b border-slate-800 pb-2">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    Account Details
                  </p>
                  <p className="mt-1 font-mono text-white break-all">
                    {email || address}
                  </p>
                  <p className="mt-0.5 text-[11px] text-cyan-300">
                    {authType === "web2_google"
                      ? "Google Smart Account"
                      : authType === "web2_email"
                      ? "Email Smart Account"
                      : "External Web3 Wallet"}
                  </p>
                </div>

                <div className="flex items-center justify-between py-1 text-slate-300">
                  <span>Balance:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {isRefreshingBalance ? (
                        <span className="text-slate-400 animate-pulse">Fetching...</span>
                      ) : (
                        <>{usdcBalance} USDC</>
                      )}
                    </span>
                    <button
                      onClick={() => { void refreshBalance(); }}
                      disabled={isRefreshingBalance}
                      className="text-slate-500 hover:text-cyan-400 transition-colors disabled:opacity-40"
                      title="Refresh live balance from Arc Testnet"
                    >
                      <RefreshCw
                        size={11}
                        className={isRefreshingBalance ? "animate-spin" : ""}
                      />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsFaucetOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 py-2 transition-colors font-medium text-[11px] mb-1"
                >
                  <Droplets size={13} /> Get Testnet USDC
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    disconnect();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 py-2 transition-colors font-medium"
                >
                  <LogOut size={13} /> Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Faucet Modal */}
      <FaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        userAddress={address}
      />
    </div>
  );
}
