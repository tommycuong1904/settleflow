type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-muted)] p-6 text-sm text-[var(--text-primary)]">
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 leading-6 text-[var(--text-muted)]">{description}</p>
    </div>

  );
}
