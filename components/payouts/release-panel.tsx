import { Button } from "@/components/shared/button";
import { formatUsdc } from "@/lib/utils/format";

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
    <div className="space-y-4 text-sm text-[var(--text-primary)]">
      <div className="space-y-1.5">
        <p className="font-semibold text-white">Approval-gated release</p>
        <p>Only approved milestones can be released in USDC on Arc.</p>
      </div>
      <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.84)] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Current release target
        </p>
        <p className="mt-3 text-xl font-semibold tracking-tight text-white">
          {formatUsdc(amount)} USDC
        </p>
        <p className="mt-1 text-sm text-[var(--text-primary)]">Network: {network}</p>
      </div>
      {enabled ? (
        <Button variant="primary">Release Payout</Button>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
          Release becomes available after approval.
        </div>
      )}
    </div>
  );
}
