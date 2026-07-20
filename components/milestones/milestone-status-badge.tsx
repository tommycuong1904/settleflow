import type { MilestoneStatus } from "@/lib/models/milestone";

const statusStyles: Record<MilestoneStatus, string> = {
  pending: "bg-slate-800 text-slate-200",
  submitted: "bg-blue-500/20 text-blue-200",
  approved: "bg-cyan-400/20 text-cyan-200",
  released: "bg-emerald-500/20 text-emerald-200",
  rejected: "bg-rose-500/20 text-rose-200",
};

type MilestoneStatusBadgeProps = {
  status: MilestoneStatus;
};

export function MilestoneStatusBadge({ status }: MilestoneStatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
