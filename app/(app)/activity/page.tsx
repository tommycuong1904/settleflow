import { cookies } from "next/headers";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { SectionCard } from "@/components/shared/section-card";
import { ActivityLedgerClient } from "@/components/activity/activity-ledger-client";
import { getWorkspaceActivity } from "@/lib/repositories/payout-activity";
import { resolveProductContextFromCookies } from "@/lib/runtime/product-context-server";

export default async function ActivityPage() {
  const cookieStore = await cookies();
  const productContext = resolveProductContextFromCookies(cookieStore);
  const workspaceId = productContext.workspaceId;

  const activities = await getWorkspaceActivity(workspaceId);

  const proofEvents = activities.filter(
    (a) =>
      a.entityType === "proof" ||
      a.action.includes("proof") ||
      a.action.includes("release"),
  );
  const approvalEvents = activities.filter(
    (a) => a.action.includes("approve") || a.action.includes("submit"),
  );

  return (
    <div className="sf-app-wrapper flex flex-col py-10 md:py-12 gap-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Audit & Settlement Ledger
        </p>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl w-full">
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
        <div className="rounded-xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Total Logged Events
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {activities.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Immutable workspace audit history
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Settlement & Releases
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {proofEvents.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Onchain payout execution events
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Approval Transitions
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {approvalEvents.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Reviewer & Contributor decisions
          </p>
        </div>
      </div>

      {/* Main Ledger Section with Interactive Filtering & Export */}
      <SectionCard title="Ledger Timeline">
        <ActivityLedgerClient initialActivities={activities} />
      </SectionCard>
    </div>
  );
}
