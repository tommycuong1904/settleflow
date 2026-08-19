"use client";

import React, { useState } from "react";
import { Button } from "@/components/shared/button";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { useWallet } from "@/lib/context/wallet-context";
import { ExternalLink, LogOut, Wallet, User, ChevronDown } from "lucide-react";

export function AppHeader() {
  const {
    isConnected,
    isConnecting,
    address,
    email,
    authType,
    network,
    usdcBalance,
    openAuthModal,
    disconnect,
  } = useWallet();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const displayIdentifier = email
    ? email.split("@")[0]
    : address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Connected";

  return (
    <div className="sf-app-header relative flex flex-wrap items-center gap-3">
      {/* Role Switcher */}
      <RoleSwitcher />

      {/* Get test USDC button */}
      <Button variant="ghost" href="https://faucet.circle.com/">
        Get test USDC{" "}
        <ExternalLink className="ml-1" size={12} aria-hidden="true" />
      </Button>

      {/* Network indicator */}
      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
        <span>{network}</span>
      </div>

      {/* Auth state button */}
      {!isConnected ? (
        <Button onClick={openAuthModal} disabled={isConnecting} variant="primary">
          {isConnecting ? "Connecting..." : "Sign In / Connect"}
        </Button>
      ) : (
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-900/90 px-3.5 py-2 text-xs font-normal text-cyan-200 hover:border-cyan-400 hover:bg-slate-800 transition-all shadow-sm"
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
                  <span className="font-semibold text-white">
                    {usdcBalance} USDC
                  </span>
                </div>

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
    </div>
  );
}
