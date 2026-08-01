import type { MilestoneStatus } from "@/lib/models/milestone";

const statusStyles: Record<MilestoneStatus, string> = {
  pending:
    "border border-[var(--border-soft)] bg-[rgba(15,23,42,0.82)] text-[var(--text-primary)]",
  submitted:
    "border border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
  approved:
    "border border-cyan-300/50 bg-cyan-400/16 text-cyan-100",
  released:
    "border border-cyan-300/55 bg-cyan-400/18 text-white",
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
