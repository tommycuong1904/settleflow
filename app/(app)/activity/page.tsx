import { cookies } from "next/headers";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { getWorkspaceActivity } from "@/lib/repositories/payout-activity";
import { resolveProductContextFromCookies } from "@/lib/runtime/product-context-server";
import { shortenAddress } from "@/lib/utils/format";
import {
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Layers,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export default async function ActivityPage() {
  const cookieStore = await cookies();
  const productContext = resolveProductContextFromCookies(cookieStore);
  const workspaceId = productContext.workspaceId;

  const activities = await getWorkspaceActivity(workspaceId);

  const proofEvents = activities.filter((a) => a.entityType === "proof" || a.action.includes("proof") || a.action.includes("release"));
  const approvalEvents = activities.filter((a) => a.action.includes("approve") || a.action.includes("submit"));

  return (
    <div className="sf-container flex flex-col py-10 md:py-12 gap-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
          Audit & Settlement Ledger
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Activity & Settlement Log
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-primary)] md:text-base">
            Complete cryptographic audit trail of milestone submissions, reviewer approvals, USDC payouts, and Arc Testnet transaction proofs.
          </p>
        </div>
      </div>

      {/* Inline Wallet Gate */}
      <WalletGate />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Total Logged Events
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {activities.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Immutable workspace audit history
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Settlement & Releases
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {proofEvents.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Onchain payout execution events
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Approval Transitions
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {approvalEvents.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Reviewer & Contributor decisions
          </p>
        </div>
      </div>

      {/* Main Ledger List */}
      <SectionCard title="Ledger Timeline">
        {activities.length === 0 ? (
          <EmptyState
            title="No activity recorded yet"
            description="Milestone submissions, reviewer decisions, and USDC releases will appear here in chronological order."
          />
        ) : (
          <div className="space-y-3.5">
            {activities.map((item) => {
              const isProof = item.entityType === "proof" || item.action.includes("proof");
              const isRelease = item.entityType === "release" || item.action.includes("release");
              const isApproval = item.action.includes("approve");
              const isRejected = item.action.includes("reject") || item.action.includes("failed");

              const txHash = item.metadata?.txHash;
              const explorerUrl = item.metadata?.explorerUrl || (txHash ? `https://testnet.arcscan.app/tx/${txHash}` : null);

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-5 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 shrink-0">
                        {isApproval ? (
                          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                          </div>
                        ) : isRejected ? (
                          <div className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                            <XCircle size={16} />
                          </div>
                        ) : isProof || isRelease ? (
                          <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                            <ShieldCheck size={16} />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center">
                            <Clock size={16} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-base font-semibold text-white">
                            {item.title}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                            {item.actorLabel}
                          </span>
                        </div>

                        {item.description ? (
                          <p className="text-xs leading-relaxed text-slate-300 font-mono">
                            {item.description}
                          </p>
                        ) : null}

                        {txHash && explorerUrl ? (
                          <div className="pt-1">
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 underline underline-offset-4 font-mono transition-colors"
                            >
                              <Layers size={13} /> Arcscan: {shortenAddress(txHash)} <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right sm:shrink-0 text-xs text-slate-400 font-mono">
                      {new Date(item.occurredAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
