import { Button } from "@/components/shared/button";

type ReleasePanelStatus = "idle" | "submitting" | "confirmed" | "failed";

type ReleasePanelProps = {
  amount: number;
  network?: string;
  enabled?: boolean;
  status?: ReleasePanelStatus;
  errorMessage?: string | null;
  onRelease?: () => void;
};

function getButtonLabel(status: ReleasePanelStatus) {
  switch (status) {
    case "submitting":
      return "Submitting...";
    case "confirmed":
      return "Released";
    case "failed":
      return "Retry release";
    case "idle":
    default:
      return "Release Payout";
  }
}

export function ReleasePanel({
  amount,
  network = "Arc Testnet",
  enabled = false,
  status = "idle",
  errorMessage = null,
  onRelease,
}: ReleasePanelProps) {
  const canRelease = enabled && status !== "submitting" && status !== "confirmed";

  const statusLine =
    status === "confirmed"
      ? "Proof is now available in the settlement panel."
      : status === "failed"
        ? errorMessage ?? "The release did not complete. Retry when the Arc path is ready."
        : status === "submitting"
          ? `Preparing the ${network} release path and waiting for a result.`
          : `Ready to release ${amount} USDC on ${network}.`;

  return enabled ? (
    <div className="space-y-3 text-sm text-[var(--text-primary)]">
      <Button variant="primary" onClick={onRelease} disabled={!canRelease}>
        {getButtonLabel(status)}
      </Button>
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.48)] px-4 py-3 text-sm text-white">
        {statusLine}
      </div>
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
      No release available yet — approve the submitted milestone to unlock release.
    </div>
  );
}

export type { ReleasePanelStatus };
