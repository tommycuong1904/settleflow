import { Button } from "@/components/shared/button";

type ReviewControlsProps = {
  submittedAt?: string;
  onApprove?: () => void | Promise<void>;
  onReject?: () => void | Promise<void>;
  busy?: boolean;
};

export function ReviewControls({
  submittedAt,
  onApprove,
  onReject,
  busy = false,
}: ReviewControlsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="font-semibold text-white">Awaiting reviewer approval</p>
        <p className="text-sm text-[var(--text-muted)]">
          Submitted {submittedAt ? submittedAt.slice(0, 10) : "recently"}. Approving this milestone makes it eligible for release.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onApprove} disabled={busy}>
          {busy ? "Processing..." : "Approve"}
        </Button>
        <Button variant="secondary" onClick={onReject} disabled={busy}>
          {busy ? "Processing..." : "Reject"}
        </Button>
      </div>
      <p className="text-xs leading-6 text-[var(--text-muted)]">
        Reject keeps the payout blocked until updated work is submitted again.
      </p>
    </div>
  );
}
