import { cookies } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { SectionCard } from "@/components/shared/section-card";
import { ActivityLedgerClient } from "@/components/activity/activity-ledger-client";
import { getWorkspaceActivity } from "@/lib/repositories/payout-activity";
import { resolveProductContextForServerPage } from "@/lib/auth/session-server";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";
import { redirect } from "next/navigation";

export default async function ActivityPage() {
  const cookieStore = await cookies();
  const contextResult = await resolveProductContextForServerPage(cookieStore);
  if (contextResult.kind === "auth-required") redirect("/auth-required?next=/activity");
  if (contextResult.kind !== "authenticated") return <ServerAuthContextState kind={contextResult.kind} />;
  const productContext = contextResult.productContext;
  const workspaceId = productContext.workspaceId;

  const activities = await getWorkspaceActivity(
    workspaceId,
    productContext.actor,
    productContext.actor === "contributor" ? productContext.activeUserId : undefined,
  );

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
    <div className="sf-app-wrapper flex flex-col py-8 md:py-12 gap-8">
      {/* Header */}
      <PageHeader
        eyebrow="Audit & Settlement Ledger"
        title="Activity & Settlement Log"
        description="Complete cryptographic audit trail of milestone submissions, reviewer approvals, USDC payouts, and Arc Testnet transaction proofs."
      />

      {/* Inline Wallet Gate */}
      <WalletGate />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
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

        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
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

        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
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
        <ActivityLedgerClient initialActivities={activities as unknown as import("@/lib/models/activity-item").ActivityItem[]} />
      </SectionCard>
    </div>
  );
}
