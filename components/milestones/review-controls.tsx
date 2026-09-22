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
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
      <div className="space-y-1 min-w-0">
        <p className="font-semibold text-[var(--foreground)] flex items-center gap-1.5 text-xs">
          <Clock size={14} className="text-amber-500 shrink-0" />
          <span>Owner Review & Decision</span>
        </p>
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Submitted {submittedAt ? new Date(submittedAt).toLocaleDateString() : "recently"}. Approving unlocks USDC release on Arc.
        </p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          variant="danger"
          size="sm"
          onClick={onReject}
          disabled={busy}
          icon={<RotateCcw size={12} />}
        >
          Request Revision
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onApprove}
          disabled={busy}
          className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white shadow-sm font-semibold"
          icon={<CheckCircle2 size={14} />}
        >
          {busy ? "Approving..." : "Approve Milestone"}
        </Button>
      </div>
    </div>
  );
}
