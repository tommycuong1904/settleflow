import { cookies } from "next/headers";
import { Button } from "@/components/shared/button";
import { SectionCard } from "@/components/shared/section-card";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { PayoutListClient } from "@/components/payouts/payout-list-client";
import { listPayouts } from "@/lib/repositories/payouts";
import { listContributors } from "@/lib/repositories/contributors";
import { resolveProductContextFromCookies } from "@/lib/runtime/product-context-server";
import { formatUsdc } from "@/lib/utils/format";
import { Plus } from "lucide-react";

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
        <PayoutListClient initialPayouts={payouts} contributors={contributors} />
      </SectionCard>
    </div>
  );
}
