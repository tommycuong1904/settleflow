type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="sf-shell rounded-xl p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-3 font-mono-numbers text-2xl font-medium tracking-tight text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
