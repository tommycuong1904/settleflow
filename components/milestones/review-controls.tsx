type ReviewControlsProps = {
  submittedAt?: string;
};

export function ReviewControls({ submittedAt }: ReviewControlsProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-white">Awaiting reviewer approval</p>
        <p className="mt-1 text-sm text-slate-400">
          Submitted {submittedAt ? submittedAt.slice(0, 10) : "recently"}
        </p>
      </div>
      <div className="flex gap-2">
        <button className="rounded-xl border border-cyan-300 bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
          Approve
        </button>
        <button className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900">
          Reject
        </button>
      </div>
    </div>
  );
}
