import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/shared/button";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";

type RecentProofProps = {
  transactionProofs: any[];
  milestones: any[];
};

export default function RecentProof({ transactionProofs, milestones }: RecentProofProps) {
  return (
    <SectionCard title="Recent Settlement Proof">
      <div className="space-y-4">
        {transactionProofs.length === 0 ? (
          <EmptyState
            title="No releases yet"
            description="Release proof events will surface here as milestones move through settlement."
          />
        ) : (
          transactionProofs.slice(0, 2).map((proof) => {
            const milestone = milestones.find((item) => item.id === proof.milestoneId);
            const proofActionLabel =
              proof.status === "failed"
                ? "Retry payout flow"
                : proof.status === "pending"
                ? "Track settlement"
                : "Open payout proof";
            const proofActionHint =
              proof.status === "failed"
                ? "Open the payout to inspect the failed release and decide whether to retry."
                : proof.status === "pending"
                ? "Open the payout to monitor confirmation and refresh proof state."
                : "Open the payout detail to review the full settlement record.";

            return (
              <div
                key={proof.id}
                className="rounded-xl border border-[var(--border-soft)] bg-white p-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-[var(--foreground)]">
                      {milestone?.title ?? "Settlement event"}
                    </p>
                    <MilestoneStatusBadge
                      status={
                        proof.status === "confirmed"
                          ? "released"
                          : proof.status === "failed"
                          ? "rejected"
                          : "submitted"
                      }
                    />
                  </div>
                  <p className="text-sm text-[var(--text-primary)]">
                    {formatUsdc(milestone?.amount ?? 0)} USDC · {proof.network ?? "Arc Testnet"}
                  </p>
                  <p className="break-all font-mono text-xs leading-6">
                    {proof.txHash
                      ? shortenAddress(proof.txHash)
                      : proof.status === "pending"
                      ? "Hash pending / unavailable"
                      : proof.status === "failed"
                      ? "No confirmed transaction hash"
                      : "Proof pending"}
                  </p>
                  {milestone?.payoutId ? (
                    <div className="space-y-3 pt-1">
                      <Button href={`/payouts/${milestone.payoutId}`} variant="ghost">
                        {proofActionLabel}
                      </Button>
                      <div className="rounded-xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
                        {proofActionHint}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}
