import type { MilestoneStatus } from "@/lib/models/milestone";

const statusStyles: Record<MilestoneStatus, string> = {
  pending:
    "border border-amber-400/30 bg-amber-400/10 text-amber-700",
  submitted:
    "border border-sky-400/20 bg-sky-400/10 text-sky-700",
  approved:
    "border border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  released:
    "border border-emerald-400/30 bg-emerald-400/12 text-emerald-100",
  rejected:
    "border border-rose-400/30 bg-rose-400/10 text-rose-200",
};

type MilestoneStatusBadgeProps = {
  status: MilestoneStatus;
};

export function MilestoneStatusBadge({ status }: MilestoneStatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize tracking-[0.04em] ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
