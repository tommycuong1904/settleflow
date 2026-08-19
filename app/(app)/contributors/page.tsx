import { cookies } from "next/headers";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { ContributorListClient } from "@/components/contributors/contributor-list-client";
import { listContributors } from "@/lib/repositories/contributors";
import { resolveProductContextFromCookies } from "@/lib/runtime/product-context-server";
import { formatUsdc } from "@/lib/utils/format";
import { Users, Coins, CheckCircle2 } from "lucide-react";

export default async function ContributorsPage() {
  const cookieStore = await cookies();
  const productContext = resolveProductContextFromCookies(cookieStore);
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
    <div className="sf-container flex flex-col py-10 md:py-12 gap-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
          Recipient Directory
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Contributors & Wallets
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-primary)] md:text-base">
            Register and manage team members, freelance developers, and audit partners. Assign Arc Testnet settlement wallets to enable automated milestone releases.
          </p>
        </div>
      </div>

      {/* Inline Wallet Gate */}
      <WalletGate />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Total Contributors
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {contributors.length}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            {activeContributors.length} active directory members
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Total Settled Volume
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatUsdc(totalSettledUsdc)} USDC
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Disbursed across completed milestones
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Active Engagements
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {totalActivePayouts}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-primary)]">
            Ongoing escrow payout contracts
          </p>
        </div>
      </div>

      {/* Interactive Contributor List */}
      <ContributorListClient initialContributors={contributors} />
    </div>
  );
}
