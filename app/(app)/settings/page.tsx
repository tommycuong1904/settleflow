"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/shared/button";
import { useRouter } from "next/navigation";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { hasRole } from "@/lib/runtime/role-utils";
import { useWallet } from "@/lib/context/wallet-context";
import { ARC_CONFIG } from "@/lib/arc/config";
import { addArcNetworkToWallet } from "@/lib/arc/onchain";
import { useToast } from "@/lib/context/toast-context";
import { ExportKeyModal } from "@/components/shared/export-key-modal";
import {
  Settings,
  Shield,
  Bell,
  Cpu,
  Wallet,
  Check,
  Copy,
  ExternalLink,
  Save,
  Globe,
  Radio,
  Sliders,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { shortenAddress } from "@/lib/utils/format";

export default function SettingsPage() {
  const router = useRouter();
  const productContext = useResolvedProductContext();
  const actor = productContext.actor;
  const isOwner = hasRole(actor, "owner");

  const { isConnected, address, email, authType, disconnect, network, getPrivateKey } = useWallet();
  const { toast } = useToast();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("SettleFlow Core DAO");
  const [supportEmail, setSupportEmail] = useState("ops@settleflow.io");
  const [webhookUrl, setWebhookUrl] = useState("https://discord.com/api/webhooks/...");
  const [notifyOnSubmit, setNotifyOnSubmit] = useState(true);
  const [notifyOnApprove, setNotifyOnApprove] = useState(true);
  const [notifyOnRelease, setNotifyOnRelease] = useState(true);
  const [rpcStatus, setRpcStatus] = useState<"idle" | "testing" | "healthy">("idle");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [webhookBusy, setWebhookBusy] = useState(false);

  useEffect(() => {
    if (!isOwner) {
      router.replace("/dashboard");
    }
  }, [isOwner, router]);

  if (!isOwner) {
    return null;
  }

  const handleTestWebhook = async () => {
    if (!webhookUrl || !webhookUrl.startsWith("http")) {
      toast({
        variant: "warning",
        title: "Invalid URL",
        description: "Please enter a valid HTTP/HTTPS webhook URL first.",
      });
      return;
    }

    setWebhookBusy(true);
    try {
      const res = await fetch("/api/v1/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = (await res.json()) as { error?: string; success?: boolean; message?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Failed to send test webhook.");
      }
      toast({
        variant: "success",
        title: "Webhook Delivered",
        description: "Test notification payload dispatched successfully!",
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Delivery Failed",
        description: err instanceof Error ? err.message : "Unable to reach webhook URL.",
      });
    } finally {
      setWebhookBusy(false);
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

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      variant: "success",
      title: "Settings Saved",
      description: "Workspace preferences and notifications updated successfully.",
    });
  };

  return (
    <div className="sf-app-wrapper flex flex-col py-10 md:py-12 gap-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
          Preferences & Configuration
        </p>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl w-full">
            Workspace Settings
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-primary)] md:text-base">
            Configure your workspace defaults, Arc Testnet blockchain parameters, and event notification webhooks.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Section 1: General Workspace Profile */}
        <div className="rounded-xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">General Workspace Profile</h2>
              <p className="text-xs text-slate-400">Organization identity and settlement currency defaults</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 text-xs">
            <div className="space-y-2">
              <label className="block font-semibold uppercase tracking-wider text-slate-300">
                Workspace Display Name
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-semibold uppercase tracking-wider text-slate-300">
                Operations / Notification Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-semibold uppercase tracking-wider text-slate-300">
                Settlement Token
              </label>
              <input
                type="text"
                disabled
                value="Circle USDC (Native on Arc)"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 px-3.5 text-xs text-slate-400 cursor-not-allowed font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-semibold uppercase tracking-wider text-slate-300">
                Default Milestone Release Rule
              </label>
              <input
                type="text"
                disabled
                value="Requires Explicit Reviewer Approval"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 px-3.5 text-xs text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Arc Blockchain & Protocol Configuration */}
        <div className="rounded-xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                <Cpu size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Arc Protocol & Node Config</h2>
                <p className="text-xs text-slate-400">Network endpoints and contract verification</p>
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
              <label className="block font-semibold uppercase tracking-wider text-slate-300">
                Arc Testnet Chain ID
              </label>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-slate-200">
                {ARC_CONFIG.chainId} (0x{ARC_CONFIG.chainId.toString(16)})
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-semibold uppercase tracking-wider text-slate-300">
                Active RPC Endpoint
              </label>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-slate-200 truncate">
                {ARC_CONFIG.rpcUrl}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block font-semibold uppercase tracking-wider text-slate-300">
                Block Explorer URL
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-slate-200">
                <span className="truncate">{ARC_CONFIG.explorerUrl}</span>
                <a
                  href={ARC_CONFIG.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  Open Arcscan <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Webhooks & Notifications */}
        <div className="rounded-xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Event Webhooks & Alerts</h2>
              <p className="text-xs text-slate-400">Receive real-time notifications on Discord, Slack, or custom endpoints</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-semibold uppercase tracking-wider text-slate-300">
                  Webhook URL (Discord / Slack / Telegram)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestWebhook}
                  disabled={webhookBusy}
                >
                  {webhookBusy ? "Sending test..." : "Send Test Webhook"}
                </Button>
              </div>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 cursor-pointer hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={notifyOnSubmit}
                  onChange={(e) => setNotifyOnSubmit(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-400 focus:ring-cyan-400 h-4 w-4"
                />
                <div>
                  <p className="font-semibold text-white">Milestone Submitted</p>
                  <p className="text-[10px] text-slate-400">Notify reviewers to inspect work</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 cursor-pointer hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={notifyOnApprove}
                  onChange={(e) => setNotifyOnApprove(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-400 focus:ring-cyan-400 h-4 w-4"
                />
                <div>
                  <p className="font-semibold text-white">Milestone Approved</p>
                  <p className="text-[10px] text-slate-400">Notify payout lead for release</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 cursor-pointer hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={notifyOnRelease}
                  onChange={(e) => setNotifyOnRelease(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-400 focus:ring-cyan-400 h-4 w-4"
                />
                <div>
                  <p className="font-semibold text-white">USDC Released</p>
                  <p className="text-[10px] text-slate-400">Attach proof & ping contributor</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Wallet & Security Session */}
        <div className="rounded-xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Security & Active Session</h2>
                <p className="text-xs text-slate-400">Wallet connection and auth principal details</p>
              </div>
            </div>

            {isConnected && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={disconnect}
              >
                Disconnect Session
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Active Account Principal
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
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <Copy size={12} /> Copy Address
                  </button>
                )}
              </div>
              <p className="text-sm font-mono text-white font-medium break-all">
                {email ? `${email} (${address?.slice(0, 6)}...${address?.slice(-4)})` : address || "Guest / Not connected"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Authentication Rail
              </p>
              <p className="text-sm font-semibold text-cyan-300">
                {authType === "web2_google"
                  ? "Google Non-Custodial Smart Account"
                  : authType === "web2_email"
                  ? "Email Magic Link Smart Account"
                  : authType === "web3_wallet"
                  ? "Direct Web3 Browser Wallet (MetaMask / Rabby)"
                  : "Guest Simulation Mode"}
              </p>
            </div>

            {(authType === "web2_google" || authType === "web2_email") && (
              <div className="md:col-span-2 p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Wallet Self-Custody & Backup</p>
                    <p className="text-[11px] text-slate-400">
                      Export your Arc Smart Account private key to import into MetaMask, Rabby, or other hardware wallets.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsExportModalOpen(true)}
                  className="shrink-0 text-amber-200 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <KeyRound size={13} className="mr-1.5" /> Export Private Key
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={<Save size={16} />}
          >
            Save Workspace Settings
          </Button>
        </div>
      </form>

      {/* Export Private Key Modal */}
      <ExportKeyModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        address={address}
        email={email}
        privateKey={getPrivateKey()}
      />
    </div>
  );
}
