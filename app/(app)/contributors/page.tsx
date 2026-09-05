import { cookies } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { ContributorListClient } from "@/components/contributors/contributor-list-client";
import { listContributors } from "@/lib/repositories/contributors";
import { resolveProductContextFromCookiesWithSession } from "@/lib/auth/session-server";
import { formatUsdc } from "@/lib/utils/format";
import { Users, Coins, CheckCircle2 } from "lucide-react";

export default async function ContributorsPage() {
  const cookieStore = await cookies();
  const productContext = await resolveProductContextFromCookiesWithSession(cookieStore);
  const workspaceId = productContext.workspaceId;

  const contributors = await listContributors({ workspaceId });

  const activeContributors = contributors.filter((c) => c.status === "active");
  const totalSettledUsdc = contributors.reduce(
    (sum, c) => sum + c.totalSettledUsdc,
    0,
  );
  const totalActivePayouts = contributors.reduce(
    (sum, c) => sum + c.activePayoutCount,
    0,
  );

  return (
    <div className="sf-app-wrapper flex flex-col py-8 md:py-12 gap-8">
      {/* Header */}
      <PageHeader
        eyebrow="Recipient Directory"
        title="Contributors & Wallets"
        description="Register and manage team members, freelance developers, and audit partners. Assign Arc Testnet settlement wallets to enable automated milestone releases."
      />

      {/* Inline Wallet Gate */}
      <WalletGate />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Total Contributors
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {contributors.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            {activeContributors.length} active directory members
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Total Settled Volume
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {formatUsdc(totalSettledUsdc)} USDC
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Disbursed across completed milestones
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Active Engagements
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {totalActivePayouts}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Ongoing escrow payout contracts
          </p>
        </div>
      </div>

      {/* Interactive Contributor List */}
      <div className="flex-1">
        <ContributorListClient initialContributors={contributors} />
      </div>
    </div>
  );
}
