import { cookies } from "next/headers";
import { Button } from "@/components/shared/button";
import { PageHeader } from "@/components/shared/page-header";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { PayoutListClient } from "@/components/payouts/payout-list-client";
import { listAccessiblePayouts } from "@/lib/repositories/payouts";
import { getSessionFromCookieStore, resolveSessionMemberships } from "@/lib/auth/session-server";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

export default async function PayoutsPage() {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieStore(cookieStore);
  if (!session) redirect("/auth-required?next=/payouts");
  const resolved = await resolveSessionMemberships(session);
  if (!resolved || resolved.memberships.length === 0) {
    return <ServerAuthContextState kind="auth-context-required" />;
  }

  const payouts = await listAccessiblePayouts({
    userId: resolved.user.id,
    memberships: resolved.memberships,
  });

  return (
    <div className="sf-app-wrapper flex flex-col py-8 md:py-12 gap-8">
      <PageHeader
        eyebrow="Payments"
        title="Payouts"
        description="Create, review, and release milestone payments for your contributors."
      >
        <Button href="/payouts/new" variant="primary" size="sm">
          <Plus size={15} className="mr-1.5" /> New Payout
        </Button>
      </PageHeader>

      <WalletGate />

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--foreground)]">All payouts</h2>
        <PayoutListClient initialPayouts={payouts} />
      </section>
    </div>
  );
}
