import { cookies } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { listPayouts } from "@/lib/repositories/payouts";
import { listContributors } from "@/lib/repositories/contributors";
import { resolveProductContextFromCookies } from "@/lib/runtime/product-context-server";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";
import { Plus, ArrowRight, Wallet, CheckCircle2, Clock } from "lucide-react";

export default async function PayoutsPage() {
  const cookieStore = await cookies();
  const productContext = resolveProductContextFromCookies(cookieStore);
  const workspaceId = productContext.workspaceId;

  const [payouts, contributors] = await Promise.all([
    listPayouts({ workspaceId }),
    listContributors({ workspaceId }),
  ]);

  const activePayouts = payouts.filter((p) =>
    ["active", "partially_released"].includes(p.status),
  );
  const completedPayouts = payouts.filter((p) => p.status === "completed");
  const totalValue = payouts.reduce((sum, p) => sum + Number(p.totalAmount), 0);

  return (
    <div className="sf-container flex flex-col py-10 md:py-12 gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            Escrow Contracts
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Contributor Payouts
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[var(--text-primary)] md:text-base">
              Manage milestone-based payment agreements, inspect release readiness, and track Arc onchain settlement history.
            </p>
          </div>
        </div>
        <div>
          <Button href="/payouts/new" variant="primary">
            <Plus size={16} className="mr-1.5" /> New Payout
          </Button>
        </div>
      </div>

      {/* Inline Wallet Connection Gate */}
      <WalletGate />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Total Payouts
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {payouts.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            {activePayouts.length} active · {completedPayouts.length} completed
          </p>
        </div>
        <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Total Value
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatUsdc(totalValue)} USDC
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Settled via Arc Testnet
          </p>
        </div>
        <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Active Contributors
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {contributors.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Registered settlement targets
          </p>
        </div>
      </div>

      {/* Payout List Section */}
      <SectionCard title="All Payout Agreements">
        {payouts.length === 0 ? (
          <EmptyState
            title="No payouts created yet"
            description="Create your first milestone payout agreement to get started with Arc settlements."
          />
        ) : (
          <div className="space-y-3.5">
            {payouts.map((payout) => {
              const contributor = contributors.find(
                (c) => c.id === payout.contributorId,
              );
              const statusLabel =
                payout.status === "completed"
                  ? "Completed"
                  : payout.status === "partially_released"
                  ? "Partially Released"
                  : payout.status === "active"
                  ? "Active"
                  : "Draft";

              return (
                <div
                  key={payout.id}
                  className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-5 hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-semibold text-white group-hover:text-cyan-200 transition-colors">
                          {payout.title}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-primary)]">
                        Recipient:{" "}
                        <strong className="text-slate-300 font-medium">
                          {contributor?.displayName ?? "Contributor"}
                        </strong>{" "}
                        {contributor?.walletAddress ? (
                          <span className="font-mono text-slate-400">
                            ({shortenAddress(contributor.walletAddress)})
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                          Amount
                        </p>
                        <p className="text-base font-semibold text-white">
                          {formatUsdc(Number(payout.totalAmount))} USDC
                        </p>
                      </div>
                      <Button href={`/payouts/${payout.id}`} variant="ghost">
                        View Details <ArrowRight size={14} className="ml-1" />
                      </Button>
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
