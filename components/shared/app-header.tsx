"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { FaucetModal } from "@/components/shared/faucet-modal";
import { ExportKeyModal } from "@/components/shared/export-key-modal";
import { useWallet } from "@/lib/context/wallet-context";
import { addArcNetworkToWallet } from "@/lib/arc/onchain";
import { useToast } from "@/lib/context/toast-context";
import { ExternalLink, LogOut, Wallet, User, ChevronDown, RefreshCw, Droplets, KeyRound, Copy, Menu } from "lucide-react";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isConnected,
    isConnecting,
    address,
    email,
    userName,
    userAvatar,
    authType,
    network,
    usdcBalance,
    isRefreshingBalance,
    openAuthModal,
    disconnect,
    refreshBalance,
    getPrivateKey,
  } = useWallet();

  const { toast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);
  const [isExportKeyOpen, setIsExportKeyOpen] = useState(false);

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

  const displayIdentifier = userName
    ? userName
    : email
    ? email.split("@")[0]
    : address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Connected";

  const handleOpenMobileSidebar = () => {
    window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"));
  };

  const handleDisconnect = async () => {
    setIsDropdownOpen(false);
    await disconnect();
    router.replace(`/auth-required?next=${encodeURIComponent(pathname || "/dashboard")}`);
  };

  return (
    <header className="sf-app-header relative w-full flex items-center">
      {/* Left group: Hamburger + SettleFlow wordmark (Mobile only) */}
      <div className="flex items-center gap-2 md:hidden shrink-0">
        <button
          type="button"
          onClick={handleOpenMobileSidebar}
          className="inline-flex items-center justify-center p-1.5 text-[var(--foreground)] hover:opacity-75 transition-opacity"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <span className="font-bold text-sm tracking-tight text-[var(--foreground)]">
          SettleFlow
        </span>
      </div>

      {/* Right group: Desktop Utilities & Wallet / Account (pushed to the right using ml-auto) */}
      <div className="ml-auto flex items-center justify-end gap-2 sm:gap-2.5">
        {/* Role Switcher on Desktop */}
        <div className="hidden md:block">
          <RoleSwitcher />
        </div>

        {/* Get test USDC on Desktop */}
        <a
          href="https://faucet.circle.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors border border-transparent hover:border-[var(--border-soft)]"
          title="Open Circle Arc Testnet Faucet in a new tab"
        >
          <Droplets size={13} className="text-[var(--foreground)]" /> Get test USDC
          <ExternalLink size={11} className="opacity-60 ml-0.5" />
        </a>

        {/* Network indicator on Desktop */}
        <button
          onClick={handleAddArcNetwork}
          title="Click to add / switch to Arc Testnet in your Web3 wallet"
          className={`hidden md:inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-all px-3 py-1.5 text-xs ${network === "Arc Testnet" ? "text-[var(--text-muted)]" : "text-rose-500"}`}
        >
          {network === "Arc Testnet" ? (
            <span className="sf-net-dot shrink-0" aria-hidden="true" />
          ) : (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
          )}
          <span className="font-medium">{network === "Arc Testnet" ? network : "Wrong network"}</span>
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
            className="flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-1.5 text-xs text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] transition-all shadow-sm"
          >
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatar}
                alt={displayIdentifier}
                className="h-4 w-4 rounded-full object-cover border border-[var(--border-soft)]"
              />
            ) : authType === "web2_google" || authType === "web2_email" ? (
              <User size={13} className="opacity-70" />
            ) : (
              <Wallet size={13} className="opacity-70" />
            )}
            <span className="font-medium text-[var(--foreground)] max-w-[120px] truncate">{displayIdentifier}</span>
            <span className="opacity-20 font-mono">|</span>
            <span className="font-mono-numbers text-[var(--foreground)] font-medium">{usdcBalance} USDC</span>
            <ChevronDown size={12} className="opacity-60" />
          </button>

          {/* Account Dropdown */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-2xl text-xs space-y-2.5 backdrop-blur-xl">
                <div className="border-b border-[var(--border-soft)] pb-2">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    Connected Account
                  </p>
                  <p className="font-mono text-[var(--foreground)] text-[11px] truncate mt-0.5">
                    {address || email}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[var(--text-muted)] py-1">
                    <span>USDC Balance</span>
                    <div className="flex items-center gap-1.5">
                      <strong className="font-mono-numbers text-[var(--foreground)] font-medium">
                        {isRefreshingBalance ? (
                          <span className="text-[var(--text-muted)] animate-pulse">Fetching...</span>
                        ) : (
                          <>{usdcBalance} USDC</>
                        )}
                      </strong>
                      <button
                        onClick={() => { void refreshBalance(); }}
                        disabled={isRefreshingBalance}
                        className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40"
                        title="Refresh live balance from Arc Testnet"
                      >
                        <RefreshCw size={11} className={isRefreshingBalance ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>
                  {address && (
                    <div className="flex items-center justify-between gap-1 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-soft)] px-2.5 py-1.5">
                      <span className="font-mono text-[11px] text-[var(--text-muted)] truncate">
                        {address.slice(0, 8)}...{address.slice(-6)}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(address);
                          toast({
                            variant: "success",
                            title: "Address Copied",
                            description: "Wallet address copied to clipboard!",
                          });
                        }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-strong)] rounded-md transition-colors"
                        title="Copy full wallet address"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {authType === "web2_google"
                      ? "Google Smart Account"
                      : authType === "web2_email"
                      ? "Email Smart Account"
                      : "External Web3 Wallet"}
                  </p>
                </div>

                <div className="border-t border-[var(--border-soft)] pt-2 space-y-1">
                  <a
                    href="https://faucet.circle.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full flex items-center gap-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--foreground)] px-2 py-1.5 transition-colors text-[11px]"
                  >
                    <Droplets size={13} /> Get Testnet USDC <ExternalLink size={10} className="ml-auto opacity-50" />
                  </a>

                  {(authType === "web2_google" || authType === "web2_email") && (
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsExportKeyOpen(true);
                      }}
                      className="w-full flex items-center gap-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--foreground)] px-2 py-1.5 transition-colors font-medium text-[11px]"
                    >
                      <KeyRound size={13} /> Export Private Key
                    </button>
                  )}

                  <button
                    onClick={() => void handleDisconnect()}
                    className="w-full flex items-center gap-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--foreground)] px-2 py-1.5 transition-colors font-medium text-[11px]"
                  >
                    <LogOut size={13} /> Disconnect
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      </div>

      {/* Faucet Modal */}
      <FaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        userAddress={address}
      />

      {/* Export Private Key Modal */}
      <ExportKeyModal
        isOpen={isExportKeyOpen}
        onClose={() => setIsExportKeyOpen(false)}
        address={address}
        email={email}
        privateKey={getPrivateKey()}
      />

    </header>
  );
}
