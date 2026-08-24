import { cookies } from "next/headers";
import { StatCard } from "@/components/dashboard/stat-card";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import PendingReview from "@/components/dashboard/PendingReview";
import ActivePayouts from "@/components/dashboard/ActivePayouts";
import RecentProof from "@/components/dashboard/RecentProof";
import { getDashboardData } from "@/lib/repositories/dashboard";
import { resolveProductContextFromCookies } from "@/lib/runtime/product-context-server";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const productContext = resolveProductContextFromCookies(cookieStore);
  const workspaceId = productContext.workspaceId;
  const { payouts, milestones, contributors, transactionProofs } =
    await getDashboardData(workspaceId);

  const activePayouts = payouts.filter((payout) =>
    ["active", "partially_released"].includes(payout.status),
  );
  const pendingApprovals = milestones.filter(
    (milestone) => milestone.status === "submitted",
  );
  const releasedMilestones = milestones.filter(
    (milestone) => milestone.status === "released",
  );
  const totalScheduled = payouts.reduce(
    (sum, payout) => sum + payout.totalAmount,
    0,
  );
  const releaseReadyMilestones = milestones.filter(
    (milestone) => milestone.status === "approved",
  );
  const releasedValue = releasedMilestones.reduce(
    (sum, milestone) => sum + milestone.amount,
    0,
  );
  const outstandingExposure = Math.max(totalScheduled - releasedValue, 0);
  const failedSettlementProof = transactionProofs.find((proof) => proof.status === "failed");
  const pendingSettlementProof = transactionProofs.find((proof) => proof.status === "pending");
  const pendingSettlementProofs = transactionProofs.filter((proof) => proof.status === "pending");
  const failedSettlementMilestone = failedSettlementProof
    ? milestones.find((milestone) => milestone.id === failedSettlementProof.milestoneId)
    : undefined;
  const pendingSettlementMilestone = pendingSettlementProof
    ? milestones.find((milestone) => milestone.id === pendingSettlementProof.milestoneId)
    : undefined;
  const inFlightSettlementValue = pendingSettlementProofs.reduce((sum, proof) => {
    const milestone = milestones.find((item) => item.id === proof.milestoneId);
    return sum + (milestone?.amount ?? 0);
  }, 0);
  const nextActionPayoutId = pendingApprovals[0]?.payoutId
    ?? failedSettlementMilestone?.payoutId
    ?? pendingSettlementMilestone?.payoutId
    ?? releaseReadyMilestones[0]?.payoutId
    ?? activePayouts[0]?.id;
  const nextActionLabel = pendingApprovals[0]
    ? "Review next milestone"
    : failedSettlementMilestone
      ? "Retry failed settlement"
      : pendingSettlementMilestone
        ? "Update pending proof"
        : releaseReadyMilestones[0]
          ? "Release approved milestone"
          : activePayouts[0]
            ? "Resume active payout"
            : null;
  const priorityQueueTitle = pendingApprovals.length > 0
    ? `${pendingApprovals.length} milestone${pendingApprovals.length === 1 ? "" : "s"} waiting for review`
    : failedSettlementMilestone
      ? `Retry settlement for ${failedSettlementMilestone.title}`
      : pendingSettlementMilestone
        ? `Update proof for ${pendingSettlementMilestone.title}`
        : `${releaseReadyMilestones.length} milestone${releaseReadyMilestones.length === 1 ? "" : "s"} ready for release`;
  const priorityQueueDescription = pendingApprovals.length > 0
    ? "Review submitted work first so approved milestones can move into release-ready state without blocking the payout flow."
    : failedSettlementMilestone
      ? "A failed settlement is blocking payout progress. Retry the release or refresh proof state before moving on."
      : pendingSettlementMilestone
        ? "A release is already in flight. Confirm or fail the settlement proof before queuing more release work."
        : releaseReadyMilestones.length > 0
          ? "No review blockers remain. Move approved milestones into Arc settlement next."
          : "No urgent payout blockers are open right now.";

  return (
    <div className="sf-app-wrapper flex flex-col py-10 md:py-12 gap-8">
      <div className="w-full flex flex-col gap-4">
        <div className="w-full">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Payout operations
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl w-full">
            Review queue, release readiness, and settlement proof in one place.
          </h1>
          <p className="text-sm leading-7 text-[var(--text-primary)] md:text-base">
            SettleFlow keeps contributor payouts visible from submitted work to
            approved release and onchain proof, so teams can move faster
            without losing control.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {nextActionPayoutId && nextActionLabel ? (
            <Button href={`/payouts/${nextActionPayoutId}`} variant="secondary">
              {nextActionLabel}
            </Button>
          ) : null}
          <Button href="/payouts/new" variant="primary">
            New Payout
          </Button>
        </div>
      </div>

      {/* Inline Wallet Connection Gate (Hybrid Web2.5) */}
      <WalletGate />

      <section className="sf-shell rounded-xl p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr] xl:items-start">
          <div className="space-y-4">
            <div className="inline-flex rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Priority queue
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {priorityQueueTitle}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[var(--text-primary)]">
                {priorityQueueDescription}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Ready to release
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {formatUsdc(releaseReadyMilestones.reduce((sum, milestone) => sum + milestone.amount, 0))} USDC
              </p>
              <p className="mt-2 text-sm text-[var(--text-primary)]">
                Approved milestone value that can move to Arc next.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Released with proof
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {formatUsdc(releasedValue)} USDC
              </p>
              <p className="mt-2 text-sm text-[var(--text-primary)]">
                Already released and visible through Arc transaction proof.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active payouts" value={activePayouts.length} />
        <StatCard label="Milestones awaiting review" value={pendingApprovals.length} />
        <StatCard
          label="Settlements in flight"
          value={`${formatUsdc(inFlightSettlementValue)} USDC`}
          hint={`${pendingSettlementProofs.length} milestone${pendingSettlementProofs.length === 1 ? "" : "s"} released and waiting for proof confirmation`}
        />
        <StatCard
          label="Outstanding exposure"
          value={`${formatUsdc(outstandingExposure)} USDC`}
          hint="USDC still waiting on review, release, or proof confirmation across visible payouts"
        />
      </section>
      <section className="sf-shell rounded-xl p-6 md:p-7">
        <DashboardTabs
          tabs={[
            {
              key: "pending",
              label: "Pending Review",
              count: pendingApprovals.length,
              content: (
                <PendingReview
                  pendingApprovals={pendingApprovals}
                  payouts={payouts}
                  contributors={contributors}
                  milestones={milestones}
                />
              ),
            },
            {
              key: "active",
              label: "Active Payouts",
              count: activePayouts.length,
              content: (
                <ActivePayouts
                  activePayouts={activePayouts}
                  payouts={payouts}
                  contributors={contributors}
                  milestones={milestones}
                  transactionProofs={transactionProofs}
                />
              ),
            },
            {
              key: "proof",
              label: "Recent Settlement Proof",
              count: transactionProofs.length,
              content: (
                <RecentProof transactionProofs={transactionProofs} milestones={milestones} />
              ),
            },
          ]}
        />
      </section>
    </div>


  );
}
