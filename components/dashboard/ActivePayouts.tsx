import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/shared/button";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { formatUsdc } from "@/lib/utils/format";

type ActivePayoutsProps = {
  activePayouts: any[];
  payouts: any[];
  contributors: any[];
  milestones: any[];
  transactionProofs: any[];
};

export default function ActivePayouts({ activePayouts, payouts, contributors, milestones, transactionProofs }: ActivePayoutsProps) {
  return (
    <SectionCard title="Active Payouts">
      <div className="space-y-4">
        {activePayouts.map((payout) => {
          const contributor = contributors.find((item) => item.id === payout.contributorId);
          const payoutMilestones = milestones.filter((m) => m.payoutId === payout.id);
          const releasedAmount = payoutMilestones
            .filter((m) => m.status === "released")
            .reduce((sum, m) => sum + m.amount, 0);
          const nextPendingReview = payoutMilestones.find((m) => m.status === "submitted");
          const nextReleaseReady = payoutMilestones.find((m) => m.status === "approved");
          const currentReleaseProof = nextReleaseReady
            ? transactionProofs.find((proof) => proof.milestoneId === nextReleaseReady.id)
            : undefined;
          const payoutStatusLabel =
            payout.status === "partially_released"
              ? "Partially released"
              : payout.status === "completed"
              ? "Completed"
              : payout.status === "active"
              ? "Active"
              : "Draft";
          const payoutActionLabel = nextPendingReview
            ? "Review milestone"
            : nextReleaseReady && currentReleaseProof?.status === "failed"
            ? "Retry settlement"
            : nextReleaseReady && currentReleaseProof?.status === "pending"
            ? "Update proof"
            : nextReleaseReady
            ? "Release milestone"
            : "View payout detail";
          const payoutActionHint = nextPendingReview
            ? `${nextPendingReview.title} is waiting for review.`
            : nextReleaseReady && currentReleaseProof?.status === "pending"
            ? `${nextReleaseReady.title} is waiting for settlement proof confirmation.`
            : nextReleaseReady && currentReleaseProof?.status === "failed"
            ? `${nextReleaseReady.title} needs a retry or proof refresh before payout progress can continue.`
            : nextReleaseReady
            ? `${nextReleaseReady.title} is approved and ready for release.`
            : payout.status === "completed"
            ? "This payout is fully settled. Open the detail view to review final proof history."
            : "Open the payout to continue milestone progress.";

          return (
            <div key={payout.id} className="rounded-xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{payout.title}</p>
                    <p className="mt-1 text-sm text-[var(--text-primary)]">
                      {contributor?.name ?? payout.contributorId}
                    </p>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                    {payoutStatusLabel}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Total commitment</p>
                    <p className="mt-1 font-semibold text-white">{formatUsdc(payout.totalAmount)} USDC</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Released so far</p>
                    <p className="mt-1 font-semibold text-white">{formatUsdc(releasedAmount)} / {formatUsdc(payout.totalAmount)} USDC</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button href={`/payouts/${payout.id}`} variant="ghost">
                    {payoutActionLabel}
                  </Button>
                  <div className="rounded-xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
                    {payoutActionHint}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
