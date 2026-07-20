type ReleasePanelProps = {
  amount: number;
  network?: string;
  enabled?: boolean;
};

export function ReleasePanel({
  amount,
  network = "Arc Testnet",
  enabled = false,
}: ReleasePanelProps) {
  return (
    <div className="space-y-3 text-sm text-slate-300">
      <p className="font-semibold text-white">Approval-gated release</p>
      <p>Only approved milestones can be released in USDC on Arc.</p>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-slate-400">Current release target</p>
        <p className="mt-2 text-lg font-semibold text-white">{amount} USDC</p>
        <p className="mt-1">Network: {network}</p>
      </div>
      <button
        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold ${
          enabled
            ? "border border-cyan-300 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            : "border border-slate-700 text-slate-400"
        }`}
      >
        {enabled ? "Release Payout" : "Release becomes available after approval"}
      </button>
    </div>
  );
}
