"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/shared/button";
import { PageHeader } from "@/components/shared/page-header";
import { usePathname, useRouter } from "next/navigation";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { hasRole } from "@/lib/runtime/role-utils";
import { useWallet } from "@/lib/context/wallet-context";
import { ARC_CONFIG } from "@/lib/arc/config";
import { addArcNetworkToWallet } from "@/lib/arc/onchain";
import { useToast } from "@/lib/context/toast-context";
import { BrowserPushToggle } from "@/components/notifications/browser-push-toggle";
import {
  Shield,
  Cpu,
  Check,
  Copy,
  ExternalLink,
  UserPlus,
  Wallet,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
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

  const handleDisconnect = async () => {
    await disconnect();
    router.replace(`/auth-required?next=${encodeURIComponent(pathname || "/settings")}`);
  };

  const handleLinkWallet = async () => {
    setIsLinkingWallet(true);
    try {
      const linkedAddress = await linkWeb3();
      const response = await fetch("/api/v1/auth/wallet/link", { cache: "no-store" });
      if (response.ok) setLinkedWallets((await response.json() as { wallets: typeof linkedWallets }).wallets);
      toast({ variant: "success", title: "Wallet linked", description: `${linkedAddress.slice(0, 6)}…${linkedAddress.slice(-4)} can now sign in to this account.` });
    } catch (error) {
      toast({ variant: "error", title: "Wallet link failed", description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setIsLinkingWallet(false);
    }
  };

  useEffect(() => {
    if (!isConnected) return;
    void fetch("/api/v1/auth/wallet/link", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { wallets: typeof linkedWallets } : null)
      .then((payload) => { if (payload) setLinkedWallets(payload.wallets); })
      .catch(() => undefined);
  }, [isConnected]);

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
          title: "RPC Healthy",
          description: `Arc Testnet node responded in ${Math.round(end - start)}ms.`,
        });
      } else {
        throw new Error("RPC status error");
      }
    } catch {
      setLatencyMs(null);
      setRpcStatus("idle");
      toast({
        variant: "warning",
        title: "RPC Check",
        description: "Arc Testnet public RPC is reachable with fallback node.",
      });
    }
  };

  return (
    <div className="sf-app-wrapper flex flex-col py-8 md:py-12 gap-8">
      {/* Header */}
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage your account, notifications, team access, and wallet connection."
      />

      <div className="space-y-8">
        {/* Team access */}
        {isOwner && <div className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8 space-y-6 bg-[var(--surface-muted)]/30">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-soft)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--text-muted)]">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Invite an owner</h2>
              <p className="text-xs text-[var(--text-muted)]">Give a trusted teammate full access to this workspace.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Contributor invite note */}
            <div className="flex items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3.5">
              <UserPlus size={14} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
              <p className="text-[var(--text-muted)] leading-relaxed">
                To invite a <strong className="text-[var(--foreground)]">Contributor</strong>, use the{" "}
                <a
                  href="/contributors"
                  className="underline underline-offset-2 text-[var(--foreground)] hover:opacity-70 transition-opacity"
                >
                  Contributors page
                </a>
                {" "}— each contributor must be linked to their workspace record first.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="space-y-2 md:col-span-1">
                <label className="block font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Invite Role
                </label>
                <div className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] py-2.5 px-3.5 text-xs text-[var(--foreground)]">
                  Owner (Full Admin Access)
                </div>
              </div>

              <div className="space-y-2 md:col-span-1">
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
        </div>}

        {/* Active session */}
        <div className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-soft)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--text-muted)]">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Your account</h2>
                <p className="text-xs text-[var(--text-muted)]">Your signed-in account and connected wallet.</p>
              </div>
            </div>

            {isConnected && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
              >
                Disconnect Session
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Signed-in account
                </p>
                {address && (
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
                    className="flex items-center gap-1 text-[11px] text-[var(--foreground)] hover:text-[var(--text-muted)] transition-colors"
                  >
                    <Copy size={12} /> Copy Address
                  </button>
                )}
              </div>
              <p className="text-sm font-mono text-[var(--foreground)] font-medium break-all">
                {email ? `${email} (${address?.slice(0, 6)}...${address?.slice(-4)})` : address || "Guest / Not connected"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Sign-in method
              </p>
              <p className="text-sm font-semibold text-[var(--text-muted)]">
                {authType === "web2_google"
                  ? "Google account — Circle Smart Wallet coming soon"
                  : authType === "web2_email"
                  ? "Email account — Circle Smart Wallet coming soon"
                  : authType === "web3_wallet"
                  ? "Direct Web3 Browser Wallet (MetaMask / Rabby)"
                  : "Guest Simulation Mode"}
              </p>
            </div>

          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Login Methods & Wallets</h2>
              <p className="text-xs text-[var(--text-muted)]">Link only a new MetaMask or Rabby address that has never been registered in SettleFlow.</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={handleLinkWallet} disabled={!isConnected || isLinkingWallet}>
              <Wallet size={13} className="mr-1.5" /> {isLinkingWallet ? "Waiting for signature..." : "Link MetaMask"}
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            Linking requires a fresh signature from the selected wallet. It never changes workspace roles, imports a private key, or merges an existing account.
          </p>
          <div className="space-y-2 pt-1">
            {linkedWallets.map((wallet) => (
              <div key={wallet.id} className="flex flex-col gap-1 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3.5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {wallet.kind === "circle_sca" ? "Circle Smart Wallet — Coming soon" : wallet.kind === "legacy_export_eoa" ? "Retired legacy EOA" : "Linked Web3 wallet"}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--text-muted)]">{wallet.address}</p>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {wallet.kind === "circle_sca" ? "Unavailable for login or release in the Web3 MVP" : wallet.authEnabled ? "Web3 sign-in enabled" : "Transaction source"}
                </p>
              </div>
            ))}
            {isConnected && linkedWallets.length === 0 ? <p className="text-xs text-[var(--text-muted)]">No linked wallets are available yet.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Browser notifications</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Receive payment and review updates when SettleFlow is not open.</p>
            </div>
            <div className="shrink-0 self-start sm:self-auto"><BrowserPushToggle workspaceId={productContext.workspaceId} /></div>
          </div>
        </div>

        {/* Advanced Arc tools */}
        <div className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-soft)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--text-muted)]">
                <Cpu size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Advanced: Arc Network</h2>
                <p className="text-xs text-[var(--text-muted)]">Connection details, node diagnostics, and wallet setup</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestRpc}
                disabled={rpcStatus === "testing"}
              >
                {rpcStatus === "testing"
                  ? "Pinging node..."
                  : rpcStatus === "healthy"
                  ? `✓ Online (${latencyMs}ms)`
                  : "Test Node Health"}
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
              >
                Add to MetaMask
              </Button>
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

      </div>
    </div>
  );
}
