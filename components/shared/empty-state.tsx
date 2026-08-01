type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-soft)] bg-[rgba(15,23,42,0.54)] p-6 text-sm text-[var(--text-primary)]">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 leading-6 text-[var(--text-muted)]">{description}</p>
    </div>
  );
}
