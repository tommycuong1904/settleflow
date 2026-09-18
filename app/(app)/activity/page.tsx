import { cookies } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { SectionCard } from "@/components/shared/section-card";
import { ActivityLedgerClient } from "@/components/activity/activity-ledger-client";
import { getAccessibleActivity } from "@/lib/repositories/payout-activity";
import { getSessionFromCookieStore, resolveSessionMemberships } from "@/lib/auth/session-server";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";
import { redirect } from "next/navigation";

export default async function ActivityPage() {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieStore(cookieStore);
  if (!session) redirect("/auth-required?next=/activity");
  const resolved = await resolveSessionMemberships(session);
  if (!resolved || resolved.memberships.length === 0) {
    return <ServerAuthContextState kind="auth-context-required" />;
  }
  const activities = await getAccessibleActivity({
    userId: resolved.user.id,
    memberships: resolved.memberships,
  });

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
        description="Recent permitted workspace events, including milestone submissions, approvals, USDC releases, and Arc Testnet settlement proofs."
      />

      {/* Inline Wallet Gate */}
      <WalletGate />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Recent Events Shown
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {activities.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Up to 50 latest permitted events
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
            Milestone submission and approval events
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
