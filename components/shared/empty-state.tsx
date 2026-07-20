type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 leading-6 text-slate-400">{description}</p>
    </div>
  );
}
