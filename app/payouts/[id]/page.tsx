import { StatCard } from "@/components/dashboard/stat-card";
import { MilestoneRow } from "@/components/milestones/milestone-row";
import { SectionCard } from "@/components/shared/section-card";
import { TransactionProofCard } from "@/components/payouts/transaction-proof-card";
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

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
          Payout detail
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {payout.title}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-300">
          Review milestones, gate release through approval, and show the Arc
          settlement path clearly enough for checkpoint demo storytelling.
        </p>
      </div>

      <SectionCard title="Payout Summary">
        <div className="grid gap-4 md:grid-cols-4">
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
            <div key={item.label}>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
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

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <SectionCard title="Milestone Workflow">
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <MilestoneRow key={milestone.id} milestone={milestone} />
            ))}
          </div>
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard title="Release Target">
            <div className="space-y-3 text-sm text-slate-300">
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
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-slate-400">Settlement rail</p>
                <p className="mt-2 text-lg font-semibold text-white">Arc Testnet</p>
                <p className="mt-1">Asset: USDC</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Settlement Proof">
            <TransactionProofCard proof={releaseProof} />
          </SectionCard>

          <SectionCard title="How SettleFlow works">
            <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-300">
              <li>Contributor submits work</li>
              <li>Reviewer approves milestone</li>
              <li>Funds are released in USDC on Arc</li>
            </ol>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
