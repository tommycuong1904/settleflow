import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { ReviewControls } from "@/components/milestones/review-controls";
import { ReleasePanel } from "@/components/payouts/release-panel";
import type { Milestone } from "@/lib/models/milestone";

type MilestoneRowProps = {
  milestone: Milestone;
};

export function MilestoneRow({ milestone }: MilestoneRowProps) {
  const isSubmitted = milestone.status === "submitted";
  const isApproved = milestone.status === "approved";
  const isReleased = milestone.status === "released";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold text-white">{milestone.title}</p>
            <MilestoneStatusBadge status={milestone.status} />
          </div>
          <p className="text-sm leading-6 text-slate-300">{milestone.description}</p>
          <p className="text-sm font-medium text-slate-200">{milestone.amount} USDC</p>
        </div>
        <div className="min-w-[240px] rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          {isSubmitted ? <ReviewControls submittedAt={milestone.submittedAt} /> : null}

          {isApproved ? (
            <ReleasePanel amount={milestone.amount} enabled network="Arc Testnet" />
          ) : null}

          {isReleased ? (
            <div className="space-y-2">
              <p className="font-semibold text-white">Released in USDC on Arc</p>
              <p>Settlement confirmed</p>
              <p className="text-xs text-slate-400">
                Released {milestone.releasedAt ? milestone.releasedAt.slice(0, 10) : "recently"}
              </p>
            </div>
          ) : null}

          {!isSubmitted && !isApproved && !isReleased ? (
            <div className="space-y-2">
              <p className="font-semibold text-white">Waiting for contributor submission</p>
              <p>Release becomes available after approval.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
