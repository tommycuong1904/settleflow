import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { ReviewControls } from "@/components/milestones/review-controls";
import type { Milestone } from "@/lib/models/milestone";
import { formatUsdc } from "@/lib/utils/format";

type MilestoneRowProps = {
  milestone: Milestone;
  onApprove?: (milestoneId: string) => void;
  onReject?: (milestoneId: string) => void;
};

export function MilestoneRow({
  milestone,
  onApprove,
  onReject,
}: MilestoneRowProps) {
  const isSubmitted = milestone.status === "submitted";
  const isApproved = milestone.status === "approved";
  const isReleased = milestone.status === "released";
  const isRejected = milestone.status === "rejected";

  return (
    <div className="sf-shell rounded-3xl p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold text-white">{milestone.title}</p>
            <MilestoneStatusBadge status={milestone.status} />
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--text-primary)]">
            {milestone.description}
          </p>
          <p className="text-sm font-semibold text-cyan-100">
            {formatUsdc(milestone.amount)} USDC
          </p>
        </div>
        <div className="sf-panel min-w-[240px] rounded-3xl p-4 text-sm text-[var(--text-primary)]">
          {isSubmitted ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="font-semibold text-white">Review needed</p>
                <p>Submitted work is ready for an approve or reject decision.</p>
              </div>
              <ReviewControls
                submittedAt={milestone.submittedAt}
                onApprove={() => onApprove?.(milestone.id)}
                onReject={() => onReject?.(milestone.id)}
              />
            </div>
          ) : null}

          {isApproved ? (
            <div className="space-y-2">
              <p className="font-semibold text-white">Ready for release</p>
              <p>Approved work can now move to the Arc release step from the side panel.</p>
            </div>
          ) : null}

          {isReleased ? (
            <div className="space-y-2">
              <p className="font-semibold text-white">Released in USDC on Arc</p>
              <p>Settlement proof is now available in the side panel.</p>
              <p className="text-xs text-[var(--text-muted)]">
                Released {milestone.releasedAt ? milestone.releasedAt.slice(0, 10) : "recently"}
              </p>
            </div>
          ) : null}

          {isRejected ? (
            <div className="space-y-2">
              <p className="font-semibold text-white">Revision requested</p>
              <p>The contributor needs to resubmit this milestone before review can continue.</p>
            </div>
          ) : null}

          {!isSubmitted && !isApproved && !isReleased && !isRejected ? (
            <div className="space-y-2">
              <p className="font-semibold text-white">Waiting for contributor submission</p>
              <p>Review and release actions will unlock after work is submitted.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
