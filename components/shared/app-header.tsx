"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { useWallet } from "@/lib/context/wallet-context";
import { useToast } from "@/lib/context/toast-context";
import { WORKFLOW_UPDATED_EVENT } from "@/lib/runtime/workflow-sync";
import { LogOut, Wallet, User, ChevronDown, RefreshCw, Copy, Menu, Bell, Settings } from "lucide-react";

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
    usdcBalance,
    isRefreshingBalance,
    openAuthModal,
    disconnect,
    refreshBalance,
  } = useWallet();

  const { toast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const notificationRequestRef = useRef(0);

  useEffect(() => {
    if (!isConnected) {
      return;
    }
    let active = true;
    const refreshUnreadNotifications = () => {
      const requestId = ++notificationRequestRef.current;
      void fetch("/api/v1/notifications", { cache: "no-store" })
        .then(async (response) => response.ok ? await response.json() as { unreadCount?: number } : null)
        .then((payload) => {
          if (active && requestId === notificationRequestRef.current) {
            setUnreadNotifications(payload?.unreadCount ?? 0);
          }
        })
        .catch(() => undefined);
    };
    const handleServiceWorkerMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "settleflow:notification") refreshUnreadNotifications();
    };
    const handleWorkflowUpdate = () => refreshUnreadNotifications();
    const handleNotificationUpdate = () => refreshUnreadNotifications();
    refreshUnreadNotifications();
    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);
    window.addEventListener(WORKFLOW_UPDATED_EVENT, handleWorkflowUpdate);
    window.addEventListener("settleflow:notifications-updated", handleNotificationUpdate);
    return () => {
      active = false;
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
      window.removeEventListener(WORKFLOW_UPDATED_EVENT, handleWorkflowUpdate);
      window.removeEventListener("settleflow:notifications-updated", handleNotificationUpdate);
    };
  }, [isConnected, pathname]);

  const displayIdentifier = authType === "web3_wallet" && address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : userName
    ? userName
    : email
    ? email.split("@")[0]
    : address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Signed in";
  const hasBrowserWallet = authType === "web3_wallet";

  const handleOpenMobileSidebar = () => {
    window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"));
  };

  const handleDisconnect = async () => {
    setIsDropdownOpen(false);
    setUnreadNotifications(0);
    await disconnect();
    router.replace(`/auth-required?next=${encodeURIComponent(pathname || "/dashboard")}`);
  };

  return (
    <header className="sf-app-header relative flex min-h-14 w-full items-center">
      {/* Left group: Hamburger + SettleFlow wordmark (Mobile only) */}
      <div className="flex shrink-0 items-center gap-1.5 md:hidden">
        <button
          type="button"
          onClick={handleOpenMobileSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <span className="text-[15px] font-bold tracking-tight text-[var(--foreground)]">
          SettleFlow
        </span>
      </div>

      {/* Right group: Desktop Utilities & Wallet / Account (pushed to the right using ml-auto) */}
      <div className="ml-auto flex items-center justify-end gap-2 sm:gap-2.5">
        {isConnected ? (
          <a
            href="/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)] md:h-8 md:w-8"
            aria-label={unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : "Notifications"}
          >
            <Bell size={14} />
            {unreadNotifications > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            ) : null}
          </a>
        ) : null}
      {/* Auth state button */}
      {!isConnected ? (
        <Button onClick={openAuthModal} disabled={isConnecting} variant="primary">
          {isConnecting ? "Connecting..." : "Sign in"}
        </Button>
      ) : (
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-xs text-[var(--foreground)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] md:h-auto md:w-auto md:gap-2 md:px-3.5 md:py-1.5"
            aria-label="Open account menu"
            title="Account"
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
            <span className="hidden max-w-[120px] truncate font-medium text-[var(--foreground)] md:block">{displayIdentifier}</span>
            {hasBrowserWallet ? <><span className="hidden font-mono opacity-20 md:block">|</span><span className="hidden font-mono-numbers font-medium text-[var(--foreground)] md:block">{usdcBalance} USDC</span></> : null}
            <ChevronDown size={12} className="hidden opacity-60 md:block" />
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
                    Signed-in account
                  </p>
                  <p className="font-mono text-[var(--foreground)] text-[11px] truncate mt-0.5">
                    {address || email}
                  </p>
                </div>

                <div className="space-y-1">
                  {hasBrowserWallet ? <>
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
                  </> : null}
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {authType === "web2_google"
                      ? "Google account"
                      : authType === "web2_email"
                      ? "Email account"
                      : "External Web3 Wallet"}
                  </p>
                </div>

                <div className="border-t border-[var(--border-soft)] pt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      router.push("/settings");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  >
                    <Settings size={13} /> Account & workspace settings
                  </button>
                  <button
                    onClick={() => void handleDisconnect()}
                    className="w-full flex items-center gap-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--foreground)] px-2 py-1.5 transition-colors font-medium text-[11px]"
                  >
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      </div>

    </header>
  );
}
