import { cookies } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { WalletGate } from "@/components/dashboard/wallet-gate";
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

  return (
    <div className="sf-app-wrapper flex flex-col py-8 md:py-12 gap-8">
      <PageHeader
        eyebrow="Updates"
        title="Activity"
        description="A complete history of work submitted, reviews, and payout releases."
      />

      <WalletGate />

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--foreground)]">All activity</h2>
        <ActivityLedgerClient initialActivities={activities} />
      </section>
    </div>
  );
}
