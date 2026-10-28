"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/shared/button";
import { PageHeader } from "@/components/shared/page-header";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { hasRole } from "@/lib/runtime/role-utils";
import { useWallet } from "@/lib/context/wallet-context";
import { ARC_CONFIG } from "@/lib/arc/config";
import { addArcNetworkToWallet } from "@/lib/arc/onchain";
import { useToast } from "@/lib/context/toast-context";
import { BrowserPushToggle } from "@/components/notifications/browser-push-toggle";
import { CirclePaymentAccount } from "@/components/settings/circle-payment-account";
import { WorkspaceMembers } from "@/components/settings/workspace-members";
import { PendingInvitations } from "@/components/settings/pending-invitations";
import { getCirclePaymentSession } from "@/lib/circle/user-controlled-client";
import {
  Shield,
  Cpu,
  Check,
  Copy,
  ChevronDown,
  ExternalLink,
  Droplets,
  UserPlus,
  Wallet,
  RefreshCw,
} from "lucide-react";

const CIRCLE_ONBOARDING_RETURN_TO_KEY = "sf_circle_onboarding_return_to";

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPaymentOnboarding = searchParams.get("onboarding") === "1";
  const requestedPaymentSetupNext = searchParams.get("next") ?? "/dashboard";
  const paymentSetupNext = requestedPaymentSetupNext.startsWith("/") && !requestedPaymentSetupNext.startsWith("//") ? requestedPaymentSetupNext : "/dashboard";
  const productContext = useResolvedProductContext();
  const actor = productContext.actor;
  const isOwner = hasRole(actor, "owner");

  const { isConnected, address, email, authType, disconnect, linkWeb3 } = useWallet();
  const { toast } = useToast();
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [linkedWallets, setLinkedWallets] = useState<Array<{
    id: string;
    address: string;
    kind: "web3_eoa" | "circle_sca" | "legacy_export_eoa";
    authEnabled: boolean;
    transactionEnabled: boolean;
    circleWallet?: { blockchain: string; accountType: string } | null;
  }>>([]);
  const [workspaceSummary, setWorkspaceSummary] = useState<{ name: string; role: string } | null>(null);
  const [workspaceLoadError, setWorkspaceLoadError] = useState<string | null>(null);
  const [workspaceLoadRequest, setWorkspaceLoadRequest] = useState(0);
  const [walletLoadError, setWalletLoadError] = useState<string | null>(null);
  const [walletLoadRequest, setWalletLoadRequest] = useState(0);
  const [circleState, setCircleState] = useState<"loading" | "configured" | "unavailable" | "error">("loading");
  const [reconnectingCircle, setReconnectingCircle] = useState(false);
  const [isSkippingPaymentSetup, setIsSkippingPaymentSetup] = useState(false);
  const [hasCircleSession, setHasCircleSession] = useState(() => Boolean(getCirclePaymentSession()));
  // Circle's Google flow returns credentials in the URL fragment. Mount its
  // SDK immediately on that return path rather than waiting for the async
  // configuration check to finish and potentially losing the callback.
  const [isCircleOAuthReturn] = useState(() => typeof window !== "undefined" && window.location.hash.includes("id_token="));
  const circlePaymentWallet = linkedWallets.find((wallet) => wallet.kind === "circle_sca");
  const browserLinkedWallets = linkedWallets.filter((wallet) => wallet.kind !== "circle_sca");
  const shouldResumeCircleConnection = isCircleOAuthReturn || reconnectingCircle;

  useEffect(() => {
    if (isPaymentOnboarding && typeof window !== "undefined") {
      window.sessionStorage.setItem(CIRCLE_ONBOARDING_RETURN_TO_KEY, paymentSetupNext);
    }
  }, [isPaymentOnboarding, paymentSetupNext]);

  const handleCircleReady = async () => {
    setReconnectingCircle(false);
    setHasCircleSession(true);
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(null, "", "/settings");
    }
    const response = await fetch("/api/v1/auth/wallet/link", { cache: "no-store" });
    if (response.ok) setLinkedWallets((await response.json() as { wallets: typeof linkedWallets }).wallets);
    setWalletLoadRequest((current) => current + 1);
    const returnTo = isPaymentOnboarding
      ? paymentSetupNext
      : typeof window !== "undefined"
        ? window.sessionStorage.getItem(CIRCLE_ONBOARDING_RETURN_TO_KEY) || "/settings"
        : "/settings";
    if (typeof window !== "undefined") window.sessionStorage.removeItem(CIRCLE_ONBOARDING_RETURN_TO_KEY);
    router.replace(returnTo);
  };

  const handleDisconnect = async () => {
    await disconnect();
    router.replace(`/auth-required?next=${encodeURIComponent(pathname || "/settings")}`);
  };

  const handleSkipPaymentSetup = async () => {
    setIsSkippingPaymentSetup(true);
    try {
      const response = await fetch("/api/v1/payment-account/onboarding/skip", { method: "POST" });
      if (!response.ok) throw new Error("Unable to save this choice.");
      if (typeof window !== "undefined") window.sessionStorage.removeItem(CIRCLE_ONBOARDING_RETURN_TO_KEY);
      router.replace(paymentSetupNext);
    } catch {
      toast({ variant: "error", title: "Couldn’t skip setup", description: "Try again, or set up your payment account now." });
    } finally {
      setIsSkippingPaymentSetup(false);
    }
  };

  const handleLinkWallet = async () => {
    setIsLinkingWallet(true);
    try {
      const linkedAddress = await linkWeb3();
      const response = await fetch("/api/v1/auth/wallet/link", { cache: "no-store" });
      if (response.ok) setLinkedWallets((await response.json() as { wallets: typeof linkedWallets }).wallets);
      toast({ variant: "success", title: "Wallet linked", description: `${linkedAddress.slice(0, 6)}…${linkedAddress.slice(-4)} is ready for Wallet payment.` });
    } catch (error) {
      toast({ variant: "error", title: "Wallet link failed", description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setIsLinkingWallet(false);
    }
  };

  useEffect(() => {
    if (!isConnected) return;
    void fetch("/api/v1/auth/wallet/link", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load linked wallets.");
        return await response.json() as { wallets: typeof linkedWallets };
      })
      .then((payload) => {
        setLinkedWallets(payload.wallets);
        setWalletLoadError(null);
      })
      .catch(() => setWalletLoadError("We couldn’t load your wallet setup. Try again before using Wallet payment."));
  }, [isConnected, walletLoadRequest]);

  useEffect(() => {
    if (!isConnected || authType !== "web2_google") return;
    void fetch("/api/v1/circle/wallet", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { configured?: boolean } : null)
      .then((payload) => setCircleState(payload?.configured ? "configured" : "unavailable"))
      .catch(() => setCircleState("error"));
  }, [authType, isConnected, walletLoadRequest]);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/workspaces", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load workspace details.");
        return await response.json() as { data?: Array<{ id: string; name: string; role: string }> };
      })
      .then((payload) => {
        if (!active) return;
        const workspace = payload?.data?.find((item) => item.id === productContext.workspaceId);
        setWorkspaceSummary(workspace ? { name: workspace.name, role: workspace.role } : null);
        setWorkspaceLoadError(null);
      })
      .catch(() => {
        if (active) {
          setWorkspaceSummary(null);
          setWorkspaceLoadError("We couldn’t refresh workspace details.");
        }
      });
    return () => { active = false; };
  }, [productContext.workspaceId, workspaceLoadRequest]);

  const [rpcStatus, setRpcStatus] = useState<"idle" | "testing" | "healthy">("idle");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingInvite(true);
    try {
      const res = await fetch("/api/v1/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "owner", email: inviteEmail.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create invitation link.");
      }
      const data = await res.json();
      setGeneratedInviteUrl(data.inviteUrl);
      toast({ title: "Invitation link generated successfully!", variant: "success" });
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Failed to create invitation", variant: "error" });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleTestRpc = async () => {
    setRpcStatus("testing");
    const start = performance.now();
    try {
      const res = await fetch(ARC_CONFIG.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
      });
      const end = performance.now();
      if (res.ok) {
        setLatencyMs(Math.round(end - start));
        setRpcStatus("healthy");
        toast({
          variant: "success",
          title: "Testnet connection is available",
          description: `The testnet node responded in ${Math.round(end - start)}ms.`,
        });
      } else {
        throw new Error("RPC status error");
      }
    } catch {
      setLatencyMs(null);
      setRpcStatus("idle");
      toast({
        variant: "warning",
        title: "Testnet connection check",
        description: "The public testnet node could not be reached. Try again later.",
      });
    }
  };

  return (
    <div className="sf-app-wrapper flex flex-col py-8 md:py-12 gap-8">
      {/* Header */}
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage your workspace, account, and notifications."
      />

      <div className="space-y-8">
        {/* Team access */}
        {isOwner && <details className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)]/30 p-6 sm:p-8">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--text-muted)]">
              <UserPlus size={20} />
            </div>
            <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Invite a workspace owner</h2>
              <p className="text-xs text-[var(--text-muted)]">Give a trusted teammate full access to this workspace when needed.</p>
            </div>
            </div>
            <ChevronDown size={18} className="shrink-0 text-[var(--text-muted)]" />
          </summary>

          <div className="mt-6 space-y-4 text-xs">
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="space-y-2.5 md:col-span-1">
                <label className="block font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Invite Role
                </label>
                <div className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] py-2.5 px-3.5 text-xs text-[var(--foreground)]">
                  Owner (Full Admin Access)
                </div>
              </div>

              <div className="space-y-2.5 md:col-span-1">
                <label className="block font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Target Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 px-3.5 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--foreground)] focus:bg-[var(--input-focus-background)] focus:outline-none"
                />
              </div>

              <div className="md:col-span-1">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleCreateInvite}
                  disabled={isGeneratingInvite}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <UserPlus size={14} />
                  {isGeneratingInvite ? "Generating..." : "Generate Invite Link"}
                </Button>
              </div>
            </div>

            {generatedInviteUrl && (
              <div className="mt-4 p-4 rounded-xl bg-[var(--surface-strong)] border border-[var(--border-soft)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--foreground)]">Invitation Link Ready:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInviteUrl);
                      setCopiedInvite(true);
                      setTimeout(() => setCopiedInvite(false), 2000);
                      toast({ title: "Link copied to clipboard!", variant: "success" });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--border-soft)] text-[var(--foreground)] font-medium transition-all"
                  >
                    {copiedInvite ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copiedInvite ? "Copied!" : "Copy Link"}
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={generatedInviteUrl}
                  className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2 px-3 text-xs font-mono text-[var(--foreground)] select-all"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Share this link with your team member. Upon opening, they will accept the invite and join this workspace as <strong className="uppercase text-[var(--foreground)]">Owner</strong>.
                </p>
              </div>
            )}
          </div>
        </details>}

        {isOwner ? <WorkspaceMembers workspaceId={productContext.workspaceId} /> : null}
        {isOwner ? <PendingInvitations /> : null}

        {/* Active session */}
        <div className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--text-muted)]">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Your account</h2>
                <p className="text-xs text-[var(--text-muted)]">Your signed-in account and workspace access.</p>
              </div>
            </div>

            {isConnected && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
                className="w-full justify-center sm:w-auto"
              >
                Sign out
              </Button>
            )}
          </div>

          <div className="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)] text-xs">
            <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Current workspace
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                  {workspaceSummary?.name ?? "Current workspace"}
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-medium capitalize text-[var(--foreground)]">
                {workspaceSummary?.role ?? actor}
              </span>
            </div>
            <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Signed-in account
                </p>
                <p className="mt-1 text-sm font-mono text-[var(--foreground)] font-medium break-all">
                  {email || address || "Guest / Not connected"}
                </p>
              </div>
              {address && <button type="button" onClick={async () => {
                await navigator.clipboard.writeText(address);
                toast({ variant: "success", title: "Address copied", description: "Wallet address copied to clipboard." });
              }} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--foreground)] hover:underline"><Copy size={12} /> Copy</button>}
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Sign-in method
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                {authType === "web2_google"
                  ? "Google account"
                  : authType === "web2_email"
                  ? "Email account"
                  : authType === "web3_wallet"
                  ? "Browser wallet"
                  : "Guest Simulation Mode"}
              </p>
            </div>

          </div>
          {workspaceLoadError ? (
            <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-300/50 bg-amber-50/70 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <p>{workspaceLoadError} Your current access is still available.</p>
              <Button type="button" variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => { setWorkspaceLoadError(null); setWorkspaceLoadRequest((current) => current + 1); }} className="shrink-0 self-start sm:self-auto">Try again</Button>
            </div>
          ) : null}
        </div>

        {authType === "web2_google" ? <section className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-muted)]"><Wallet size={20} /></div>
            <div><h2 className="text-base font-semibold text-[var(--foreground)]">{isPaymentOnboarding ? "Set up your payment account" : "Payment account"}</h2><p className="text-xs text-[var(--text-muted)]">{isPaymentOnboarding ? "Create a secure USDC account now, or skip and set it up when you need it." : "Your secure USDC account for Arc Testnet payments."}</p></div>
          </div>
          <div className="mt-5">
            {circleState === "loading" && !isCircleOAuthReturn ? <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">Checking your payment account…</div> : circleState === "error" ? <div className="flex flex-col gap-3 rounded-xl border border-amber-300/50 bg-amber-50/70 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Payment account is temporarily unavailable</p><p className="mt-1 text-xs">Try again in a moment. Your existing payment address is unchanged.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => { setCircleState("loading"); setWalletLoadRequest((current) => current + 1); }}>Try again</Button></div> : circleState === "unavailable" ? <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">Payment accounts are not enabled in this environment yet.</div> : circlePaymentWallet && !shouldResumeCircleConnection ? <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3.5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-[var(--foreground)]">Payment account ready</p><p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">{circlePaymentWallet.address}</p><p className="mt-1 text-[11px] text-[var(--text-muted)]">{isOwner ? "Fund with test USDC before your first payment." : "Ready to receive USDC in this workspace. If your contributor profile has no address, SettleFlow will use this one."}</p></div>{hasCircleSession ? <span className="text-xs font-medium text-emerald-700">Connected</span> : <Button type="button" variant="secondary" size="sm" onClick={() => setReconnectingCircle(true)} className="shrink-0">Connect</Button>}</div> : <CirclePaymentAccount reconnect={Boolean(circlePaymentWallet)} purpose={isOwner ? "pay" : "receive"} onReady={() => { void handleCircleReady(); }} />}
          </div>
          {isPaymentOnboarding && !circlePaymentWallet && circleState !== "loading" ? <Button type="button" variant="ghost" size="sm" onClick={() => { void handleSkipPaymentSetup(); }} disabled={isSkippingPaymentSetup} className="mt-4">{isSkippingPaymentSetup ? "Saving..." : "Skip for now"}</Button> : null}
        </section> : null}

        <details className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-muted)]">
                <Wallet size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Browser wallet (advanced)</h2>
                <p className="text-xs text-[var(--text-muted)]">Optional technical fallback for browser-wallet payments.</p>
              </div>
            </div>
            <ChevronDown size={18} className="shrink-0 text-[var(--text-muted)]" />
          </summary>
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Connect a browser wallet</h3>
                <p className="text-xs text-[var(--text-muted)]">Not needed to create payouts, review work, or record a simulated payment.</p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleLinkWallet} disabled={!isConnected || isLinkingWallet} className="w-full justify-center sm:w-auto">
                <Wallet size={13} className="mr-1.5" /> {isLinkingWallet ? "Waiting for signature..." : "Link wallet"}
              </Button>
            </div>
            <div className="space-y-2 pt-1">
            {walletLoadError ? (
              <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-300/50 bg-amber-50/70 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                <p>{walletLoadError}</p>
                <Button type="button" variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => { setWalletLoadError(null); setWalletLoadRequest((current) => current + 1); }} className="shrink-0 self-start sm:self-auto">Try again</Button>
              </div>
            ) : null}
            {browserLinkedWallets.map((wallet) => (
              <div key={wallet.id} className="flex flex-col gap-1 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3.5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {wallet.kind === "legacy_export_eoa" ? "Previously linked wallet — unavailable" : "Wallet payment address"}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--text-muted)]">{wallet.address}</p>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {wallet.authEnabled ? "Available for wallet payment" : "Payment source"}
                </p>
              </div>
            ))}
            {isConnected && browserLinkedWallets.length === 0 && !walletLoadError ? <p className="text-xs text-[var(--text-muted)]">No browser wallet is linked. You only need one for the technical fallback.</p> : null}
            </div>
          </div>
        </details>

        <div className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Browser notifications</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Receive payment and review updates when SettleFlow is not open.</p>
            </div>
            <div className="shrink-0 self-start sm:self-auto"><BrowserPushToggle workspaceId={productContext.workspaceId} /></div>
          </div>
        </div>

        <details className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--text-muted)]">
                <Cpu size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Technical diagnostics</h2>
                <p className="text-xs text-[var(--text-muted)]">For troubleshooting advanced wallet payment setup. Not required for normal use.</p>
              </div>
            </div>
            <ChevronDown size={18} className="shrink-0 text-[var(--text-muted)]" />
          </summary>

          <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestRpc}
                disabled={rpcStatus === "testing"}
                className="w-full justify-center sm:w-auto"
              >
                {rpcStatus === "testing"
                  ? "Pinging node..."
                  : rpcStatus === "healthy"
                  ? `✓ Online (${latencyMs}ms)`
                  : "Test testnet connection"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    await addArcNetworkToWallet();
                  } catch {}
                }}
                className="w-full justify-center sm:w-auto"
              >
                Add Arc Testnet
              </Button>
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-soft)] px-3 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] sm:w-auto"
              >
                <Droplets size={13} /> Get test USDC <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 text-xs">
            <div className="space-y-2">
              <label className="block font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Arc Testnet Chain ID
              </label>
              <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] font-mono text-[var(--text-muted)]">
                {ARC_CONFIG.chainId} (0x{ARC_CONFIG.chainId.toString(16)})
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Active RPC Endpoint
              </label>
              <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] font-mono text-[var(--text-muted)] truncate">
                {ARC_CONFIG.rpcUrl}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Block Explorer URL
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] font-mono text-[var(--text-muted)]">
                <span className="truncate">{ARC_CONFIG.explorerUrl}</span>
                <a
                  href={ARC_CONFIG.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--foreground)] hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  Open Arcscan <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
          </div>
        </details>

      </div>
    </div>
  );
}
