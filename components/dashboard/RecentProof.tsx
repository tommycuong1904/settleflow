import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/shared/button";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { formatUsdc } from "@/lib/utils/format";
import type { DashboardData } from "@/lib/repositories/dashboard";

type RecentProofProps = {
  transactionProofs: DashboardData["transactionProofs"];
  milestones: DashboardData["milestones"];
};

export default function RecentProof({ transactionProofs, milestones }: RecentProofProps) {
  return (
    <SectionCard title="Recent payments">
      <div className="space-y-4">
        {transactionProofs.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Payment updates will appear here as milestones are paid."
          />
        ) : (
          transactionProofs.slice(0, 2).map((proof) => {
            const milestone = milestones.find((item) => item.id === proof.milestoneId);
            const proofActionLabel =
              proof.status === "failed"
                ? "Review payment issue"
                : proof.status === "pending"
                ? "Check payment status"
                : "View payment record";
            const proofActionHint =
              proof.status === "failed"
                ? "Open the payout to review the issue and decide whether to retry."
                : proof.status === "pending"
                ? "Open the payout to check confirmation status."
                : "Open the payout detail to review the payment record.";
            const paymentSummary =
              proof.status === "confirmed"
                ? "Payment recorded"
                : proof.status === "pending"
                  ? "Waiting for payment confirmation"
                  : "Payment attempt needs review";

            return (
              <div
                key={proof.id}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-[var(--foreground)]">
                      {milestone?.title ?? "Payment update"}
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
                    {formatUsdc(milestone?.amount ?? 0)} USDC · {paymentSummary}
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
