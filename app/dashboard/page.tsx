import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { mockContributors } from "@/lib/data/mock-contributors";
import { mockMilestones } from "@/lib/data/mock-milestones";
import { mockPayouts } from "@/lib/data/mock-payouts";
import { mockTransactionProofs } from "@/lib/data/mock-transaction-proofs";
import { formatUsdc } from "@/lib/utils/format";

export default function DashboardPage() {
  const activePayouts = mockPayouts.filter((payout) =>
    ["active", "partially_released"].includes(payout.status),
  );
  const pendingApprovals = mockMilestones.filter(
    (milestone) => milestone.status === "submitted",
  );
  const releasedMilestones = mockMilestones.filter(
    (milestone) => milestone.status === "released",
  );
  const totalScheduled = mockPayouts.reduce(
    (sum, payout) => sum + payout.totalAmount,
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
            Payout operations
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Payout Dashboard
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-300">
            Monitor milestone-based contributor payouts, review queue pressure,
            and release readiness on Arc.
          </p>
        </div>
        <Link
          href="/payouts/new"
          className="inline-flex items-center justify-center rounded-xl border border-cyan-300 bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          New Payout
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Payouts" value={activePayouts.length} />
        <StatCard label="Pending Approvals" value={pendingApprovals.length} />
        <StatCard label="Released Milestones" value={releasedMilestones.length} />
        <StatCard
          label="Total USDC Scheduled"
          value={`${formatUsdc(totalScheduled)} USDC`}
          hint="Visible milestone commitments across all payouts"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Active Payouts">
          <div className="space-y-4">
            {activePayouts.map((payout) => {
              const contributor = mockContributors.find(
                (item) => item.id === payout.contributorId,
              );
              const payoutMilestones = mockMilestones.filter(
                (milestone) => milestone.payoutId === payout.id,
              );
              const releasedAmount = payoutMilestones
                .filter((milestone) => milestone.status === "released")
                .reduce((sum, milestone) => sum + milestone.amount, 0);

              return (
                <div
                  key={payout.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <p className="font-semibold text-white">{payout.title}</p>
                      <p className="text-sm text-slate-400">
                        {contributor?.name ?? payout.contributorId} · {formatUsdc(payout.totalAmount)} USDC
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {payout.status.replace("_", " ")} · released {formatUsdc(releasedAmount)} / {formatUsdc(payout.totalAmount)} USDC
                      </p>
                    </div>
                    <Link
                      href={`/payouts/${payout.id}`}
                      className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard title="Pending Review">
            <div className="space-y-4">
              {pendingApprovals.length === 0 ? (
                <EmptyState
                  title="No milestones waiting for review"
                  description="As contributors submit work, review-ready milestones will appear here."
                />
              ) : (
                pendingApprovals.map((milestone) => {
                  const payout = mockPayouts.find(
                    (item) => item.id === milestone.payoutId,
                  );
                  return (
                    <div
                      key={milestone.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <MilestoneStatusBadge status={milestone.status} />
                      </div>
                      <p className="font-semibold text-white">{milestone.title}</p>
                      <p className="text-sm text-slate-400">
                        {formatUsdc(milestone.amount)} USDC awaiting review
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {payout?.title}
                      </p>
                      <Link
                        href={`/payouts/${milestone.payoutId}`}
                        className="mt-3 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                      >
                        Review
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>

          <SectionCard title="Recent Releases">
            <div className="space-y-4">
              {releasedMilestones.length === 0 ? (
                <EmptyState
                  title="No releases yet"
                  description="Released milestones will surface Arc transaction proof here."
                />
              ) : (
                releasedMilestones.slice(0, 2).map((milestone) => {
                  const proof = mockTransactionProofs.find(
                    (item) => item.milestoneId === milestone.id,
                  );
                  return (
                    <div
                      key={milestone.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <p className="font-semibold text-white">{milestone.title}</p>
                      <p className="text-sm text-slate-400">
                        {formatUsdc(milestone.amount)} USDC · {proof?.network ?? "Arc Testnet"}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-cyan-200">
                        {proof ? `${proof.txHash.slice(0, 18)}...` : "Proof pending"}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
