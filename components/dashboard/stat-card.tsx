type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="sf-shell rounded-2xl p-5 sm:p-6 transition-all duration-200 hover:border-[var(--border-strong)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-3 font-mono-numbers text-2xl sm:text-[28px] font-semibold tracking-tight text-[var(--foreground)] leading-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
