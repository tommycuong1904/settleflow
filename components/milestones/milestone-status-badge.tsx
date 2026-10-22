import type { MilestoneStatus } from "@/lib/models/milestone";

const statusStyles: Record<MilestoneStatus, string> = {
  pending:
    "border border-amber-400/30 bg-amber-400/10 text-amber-800 dark:text-amber-200",
  submitted:
    "border border-sky-400/20 bg-sky-400/10 text-sky-800 dark:text-sky-200",
  approved:
    "border border-emerald-400/25 bg-emerald-400/10 text-emerald-800 dark:text-emerald-200",
  released:
    "border border-emerald-400/30 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100",
  rejected:
    "border border-rose-400/30 bg-rose-400/10 text-rose-800 dark:text-rose-200",
};

const textStatusStyles: Record<MilestoneStatus, string> = {
  pending: "text-amber-700 dark:text-amber-300",
  submitted: "text-sky-700 dark:text-sky-300",
  approved: "text-[var(--text-muted)]",
  released: "text-emerald-700 dark:text-emerald-200",
  rejected: "text-rose-700 dark:text-rose-300",
};

const statusLabels: Record<MilestoneStatus, string> = {
  pending: "Not started",
  submitted: "Submitted",
  approved: "Approved",
  released: "Paid",
  rejected: "Changes requested",
};

type MilestoneStatusBadgeProps = {
  status: MilestoneStatus;
  variant?: "badge" | "text";
};

export function MilestoneStatusBadge({ status, variant = "badge" }: MilestoneStatusBadgeProps) {
  return (
    <span
      className={
        variant === "text"
          ? `text-xs font-semibold capitalize ${textStatusStyles[status]}`
          : `rounded-full px-3 py-1 text-xs font-semibold capitalize tracking-[0.04em] ${statusStyles[status]}`
      }
    >
      {statusLabels[status]}
    </span>
  );
}
