import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { PayoutListClient } from "@/components/payouts/payout-list-client";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";
import { getSessionFromCookieStore, resolveSessionMemberships } from "@/lib/auth/session-server";
import { listAccessiblePayouts } from "@/lib/repositories/payouts";

export default async function MyWorkPage() {
  const session = await getSessionFromCookieStore(await cookies());
  if (!session) redirect("/auth-required?next=/my-work");

  const resolved = await resolveSessionMemberships(session);
  if (!resolved || resolved.memberships.length === 0) {
    return <ServerAuthContextState kind="auth-context-required" />;
  }

  const contributorMemberships = resolved.memberships.filter((membership) => membership.role === "contributor");
  if (contributorMemberships.length === 0) redirect("/dashboard");

  const payouts = await listAccessiblePayouts({
    userId: resolved.user.id,
    memberships: contributorMemberships,
  });

  return (
    <div className="sf-app-wrapper flex flex-col gap-8 py-8 md:py-12">
      <PageHeader
        eyebrow="Contributor workspace"
        title="My work and payments"
        description="Submit milestone evidence, respond to revision requests, and track settlement proof for your assigned payouts."
      />
      <SectionCard title="Assigned payout agreements">
        <PayoutListClient initialPayouts={payouts} />
      </SectionCard>
    </div>
  );
}
