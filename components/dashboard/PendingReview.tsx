import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/shared/button";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";

type PendingReviewProps = {
  pendingApprovals: any[];
  payouts: any[];
  contributors: any[];
  milestones: any[];
};

export default function PendingReview({ pendingApprovals, payouts, contributors, milestones }: PendingReviewProps) {
  return (
    <SectionCard title="Pending Review Queue">
      <div className="space-y-4">
        {pendingApprovals.length === 0 ? (
          <EmptyState
            title="No milestones waiting for review"
            description="As contributors submit work, review‑ready milestones will appear here."
          />
        ) : (
          pendingApprovals.map((milestone) => {
            const payout = payouts.find((item) => item.id === milestone.payoutId);
            const contributor = contributors.find((item) => item.id === payout?.contributorId);

            return (
              <div key={milestone.id} className="sf-shell rounded-xl p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <MilestoneStatusBadge status={milestone.status} />
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {payout?.title}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-lg font-semibold text-[var(--foreground)]">{milestone.title}</p>
                      <p className="text-sm text-[var(--text-primary)]">
                        {contributor?.name ?? payout?.contributorId ?? "Unknown contributor"} · {formatUsdc(milestone.amount)} USDC awaiting review
                      </p>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                      {milestone.description}
                    </p>
                  </div>
                  <div className="flex min-w-[180px] flex-col gap-3">
                    <Button href={`/payouts/${milestone.payoutId}`} variant="primary">
                      Review milestone
                    </Button>
                    <div className="rounded-xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
                      Approving this milestone unlocks the next release step.
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}
