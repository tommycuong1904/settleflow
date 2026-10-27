import { Button } from "@/components/shared/button";
import { CheckCircle2, RotateCcw, Clock } from "lucide-react";

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
    <div className="flex flex-col gap-3.5 border-t border-[var(--border-soft)] pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 min-w-0">
        <p className="font-semibold text-[var(--foreground)] flex items-center gap-1.5 text-xs">
          <Clock size={14} className="text-amber-500 shrink-0" />
          <span>Ready for your review</span>
        </p>
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Submitted {submittedAt ? new Date(submittedAt).toLocaleDateString() : "recently"}. Approve to make it ready for payment, or request changes from the contributor.
        </p>
      </div>
      <div className="flex w-full items-center gap-2.5 sm:w-auto sm:shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={onReject}
          disabled={busy}
          icon={<RotateCcw size={12} />}
          className="flex-1 justify-center sm:flex-none"
        >
          Request changes
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onApprove}
          disabled={busy}
          className="flex-1 justify-center font-semibold sm:flex-none"
          icon={<CheckCircle2 size={14} />}
        >
          {busy ? "Approving..." : "Approve work"}
        </Button>
      </div>
    </div>
  );
}
