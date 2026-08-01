type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="sf-shell rounded-3xl p-6">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{hint}</p> : null}
    </div>
  );
}
