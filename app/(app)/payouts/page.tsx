import { cookies } from "next/headers";
import { Button } from "@/components/shared/button";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { PayoutListClient } from "@/components/payouts/payout-list-client";
import { listPayouts } from "@/lib/repositories/payouts";
import { listContributors } from "@/lib/repositories/contributors";
import { resolveProductContextForServerPage } from "@/lib/auth/session-server";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";
import { redirect } from "next/navigation";
import { formatUsdc } from "@/lib/utils/format";
import { Plus } from "lucide-react";

export default async function PayoutsPage() {
  const cookieStore = await cookies();
  const contextResult = await resolveProductContextForServerPage(cookieStore);
  if (contextResult.kind === "auth-required") redirect("/auth-required?next=/payouts");
  if (contextResult.kind !== "authenticated") return <ServerAuthContextState kind={contextResult.kind} />;
  const productContext = contextResult.productContext;
  if (productContext.actor === "reviewer" || productContext.actor === "ops") throw new Error("FORBIDDEN_PAYOUT_LIST");
  const workspaceId = productContext.workspaceId;

  const [payouts, contributors] = await Promise.all([
    listPayouts({
      workspaceId,
      linkedUserId: productContext.actor === "contributor" ? productContext.activeUserId : undefined,
    }),
    listContributors({ workspaceId }),
  ]);

  const activePayouts = payouts.filter((p) =>
    ["active", "partially_released"].includes(p.status),
  );
  const completedPayouts = payouts.filter((p) => p.status === "completed");
  const totalValue = payouts.reduce((sum, p) => sum + Number(p.totalAmount), 0);

  return (
    <div className="sf-app-wrapper flex flex-col py-8 md:py-12 gap-8">
      {/* Header */}
      <PageHeader
        eyebrow="Escrow Contracts"
        title="Contributor Payouts"
        description="Manage milestone-based payment agreements, inspect release readiness, and track Arc onchain settlement history."
      >
        <Button href="/payouts/new" variant="primary" size="sm">
          <Plus size={15} className="mr-1.5" /> New Payout
        </Button>
      </PageHeader>

      {/* Inline Wallet Connection Gate */}
      <WalletGate />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Total Payouts
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {payouts.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            {activePayouts.length} active · {completedPayouts.length} completed
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Total Value
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {formatUsdc(totalValue)} USDC
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Settled via Arc Testnet
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Active Contributors
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
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
