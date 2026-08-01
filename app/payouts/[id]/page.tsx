import { StatCard } from "@/components/dashboard/stat-card";
import { MilestoneRow } from "@/components/milestones/milestone-row";
import { TransactionProofCard } from "@/components/payouts/transaction-proof-card";
import { SectionCard } from "@/components/shared/section-card";
import { mockContributors } from "@/lib/data/mock-contributors";
import { mockMilestones } from "@/lib/data/mock-milestones";
import { mockPayouts } from "@/lib/data/mock-payouts";
import { mockTransactionProofs } from "@/lib/data/mock-transaction-proofs";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";

type PayoutDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayoutDetailPage({
  params,
}: PayoutDetailPageProps) {
  const { id } = await params;
  const payout = mockPayouts.find((item) => item.id === id) ?? mockPayouts[0];
  const milestones = mockMilestones.filter(
    (milestone) => milestone.payoutId === payout.id,
  );
  const contributor = mockContributors.find(
    (item) => item.id === payout.contributorId,
  );
  const releaseProof = mockTransactionProofs.find((proof) =>
    milestones.some((milestone) => milestone.id === proof.milestoneId),
  );
  const nextReleasableMilestone = milestones.find(
    (milestone) => milestone.status === "approved",
  );

  const approvedCount = milestones.filter(
    (milestone) => milestone.status === "approved" || milestone.status === "released",
  ).length;
  const releasedCount = milestones.filter(
    (milestone) => milestone.status === "released",
  ).length;
  const amountReleased = milestones
    .filter((milestone) => milestone.status === "released")
    .reduce((sum, milestone) => sum + milestone.amount, 0);
  const submittedCount = milestones.filter(
    (milestone) => milestone.status === "submitted",
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            Payout detail
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {payout.title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[var(--text-primary)] md:text-base">
              Review milestone submissions, approve release in sequence, and keep
              Arc settlement proof attached to the payout flow.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Review pressure
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {submittedCount}
            </p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">
              milestone{submittedCount === 1 ? "" : "s"} currently waiting for approval
            </p>
          </div>
          <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Release-ready next
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-white">
              {nextReleasableMilestone ? nextReleasableMilestone.title : "No milestone approved yet"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">
              {nextReleasableMilestone
                ? `${formatUsdc(nextReleasableMilestone.amount)} USDC can move to Arc next.`
                : "Approval unlocks the next release step."}
            </p>
          </div>
        </div>
      </div>

      <SectionCard title="Payout Summary">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Contributor", value: contributor?.name ?? payout.contributorId },
            {
              label: "Wallet",
              value: contributor ? shortenAddress(contributor.walletAddress) : "Unknown",
            },
            { label: "Total amount", value: `${formatUsdc(payout.totalAmount)} USDC` },
            {
              label: "Payout status",
              value: payout.status.replace("_", " "),
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {item.label}
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total milestones" value={milestones.length} />
        <StatCard label="Approved" value={approvedCount} />
        <StatCard label="Released" value={releasedCount} />
        <StatCard
          label="Amount released"
          value={`${formatUsdc(amountReleased)} USDC`}
          hint="Released milestones already settled on Arc"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Milestone Workflow">
          <div className="mb-5 rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.66)] p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Submitted now
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {submittedCount}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Approved next
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {nextReleasableMilestone ? formatUsdc(nextReleasableMilestone.amount) : "0"} USDC
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Released already
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {formatUsdc(amountReleased)} USDC
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <MilestoneRow key={milestone.id} milestone={milestone} />
            ))}
          </div>
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard title="Release Target">
            <div className="space-y-4 text-sm text-[var(--text-primary)]">
              <div className="space-y-1.5">
                <p className="font-semibold text-white">
                  {nextReleasableMilestone
                    ? nextReleasableMilestone.title
                    : "No approved milestone waiting for release"}
                </p>
                <p>
                  {nextReleasableMilestone
                    ? `${formatUsdc(nextReleasableMilestone.amount)} USDC is ready for App Kit Send integration.`
                    : "Once a milestone is approved, it becomes eligible for Arc settlement."}
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.74)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Settlement rail
                </p>
                <p className="mt-3 text-lg font-semibold text-white">Arc Testnet</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">Asset: USDC</p>
              </div>
              <div className="rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
                Release should happen only after reviewer approval is visible in the milestone workflow.
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Settlement Proof">
            <TransactionProofCard proof={releaseProof} />
          </SectionCard>

          <SectionCard title="How SettleFlow works">
            <div className="space-y-3 text-sm text-[var(--text-primary)]">
              {[
                "Contributor submits work against a milestone.",
                "Reviewer approves the milestone before release.",
                "Approved funds move in USDC on Arc and attach transaction proof.",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.56)] p-4"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                    {index + 1}
                  </div>
                  <p className="leading-6">{item}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
