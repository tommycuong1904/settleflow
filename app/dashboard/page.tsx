import { StatCard } from "@/components/dashboard/stat-card";
import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { getDashboardData } from "@/lib/repositories/dashboard";
import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";

export default async function DashboardPage() {
  const { payouts, milestones, contributors, transactionProofs } =
    await getDashboardData(DEFAULT_PRODUCT_CONTEXT.workspaceId);

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
  const nextActionPayoutId = pendingApprovals[0]?.payoutId ?? releaseReadyMilestones[0]?.payoutId ?? activePayouts[0]?.id;
  const nextActionLabel = pendingApprovals[0]
    ? "Review next milestone"
    : releaseReadyMilestones[0]
      ? "Release approved milestone"
      : activePayouts[0]
        ? "Resume active payout"
        : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            Payout operations
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Review queue, release readiness, and settlement proof in one place.
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[var(--text-primary)] md:text-base">
              SettleFlow keeps contributor payouts visible from submitted work to
              approved release and onchain proof, so teams can move faster
              without losing control.
            </p>
          </div>
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

      <section className="sf-shell rounded-3xl p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr] xl:items-start">
          <div className="space-y-4">
            <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Priority queue
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                {pendingApprovals.length} milestone{pendingApprovals.length === 1 ? "" : "s"} waiting for review
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[var(--text-primary)]">
                Review submitted work first so approved milestones can move into release-ready state without blocking the payout flow.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Ready to release
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                {formatUsdc(releaseReadyMilestones.reduce((sum, milestone) => sum + milestone.amount, 0))} USDC
              </p>
              <p className="mt-2 text-sm text-[var(--text-primary)]">
                Approved milestone value that can move to Arc next.
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Released with proof
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
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
        <StatCard label="Milestones ready to release" value={releaseReadyMilestones.length} />
        <StatCard
          label="Total scheduled"
          value={`${formatUsdc(totalScheduled)} USDC`}
          hint="Visible milestone commitments across all payouts"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Pending Review Queue">
          <div className="space-y-4">
            {pendingApprovals.length === 0 ? (
              <EmptyState
                title="No milestones waiting for review"
                description="As contributors submit work, review-ready milestones will appear here."
              />
            ) : (
              pendingApprovals.map((milestone) => {
                const payout = payouts.find((item) => item.id === milestone.payoutId);
                const contributor = contributors.find(
                  (item) => item.id === payout?.contributorId,
                );

                return (
                  <div
                    key={milestone.id}
                    className="sf-shell rounded-3xl p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <MilestoneStatusBadge status={milestone.status} />
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {payout?.title}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-lg font-semibold text-white">{milestone.title}</p>
                          <p className="text-sm text-[var(--text-primary)]">
                            {contributor?.name ?? payout?.contributorId ?? "Unknown contributor"} · {formatUsdc(milestone.amount)} USDC awaiting review
                          </p>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                          {milestone.description}
                        </p>
                      </div>
                      <div className="flex min-w-[180px] flex-col gap-3">
                        <Button href={`/payouts/${milestone.payoutId}`} variant="primary">
                          Review milestone
                        </Button>
                        <div className="rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
                          Approving this milestone unlocks the next release step.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard title="Active Payouts">
            <div className="space-y-4">
              {activePayouts.map((payout) => {
                const contributor = contributors.find(
                  (item) => item.id === payout.contributorId,
                );
                const payoutMilestones = milestones.filter(
                  (milestone) => milestone.payoutId === payout.id,
                );
                const releasedAmount = payoutMilestones
                  .filter((milestone) => milestone.status === "released")
                  .reduce((sum, milestone) => sum + milestone.amount, 0);
                const nextPendingReview = payoutMilestones.find(
                  (milestone) => milestone.status === "submitted",
                );
                const nextReleaseReady = payoutMilestones.find(
                  (milestone) => milestone.status === "approved",
                );
                const payoutActionLabel = nextPendingReview
                  ? "Review milestone"
                  : nextReleaseReady
                    ? "Release milestone"
                    : "View payout detail";
                const payoutActionHint = nextPendingReview
                  ? `${nextPendingReview.title} is waiting for review.`
                  : nextReleaseReady
                    ? `${nextReleaseReady.title} is approved and ready for release.`
                    : "Open the payout to continue milestone progress.";

                return (
                  <div
                    key={payout.id}
                    className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-white">{payout.title}</p>
                          <p className="mt-1 text-sm text-[var(--text-primary)]">
                            {contributor?.name ?? payout.contributorId}
                          </p>
                        </div>
                        <MilestoneStatusBadge
                          status={payout.status === "partially_released" ? "approved" : "pending"}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Total commitment
                          </p>
                          <p className="mt-1 font-semibold text-white">
                            {formatUsdc(payout.totalAmount)} USDC
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Released so far
                          </p>
                          <p className="mt-1 font-semibold text-white">
                            {formatUsdc(releasedAmount)} / {formatUsdc(payout.totalAmount)} USDC
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Button href={`/payouts/${payout.id}`} variant="ghost">
                          {payoutActionLabel}
                        </Button>
                        <div className="rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
                          {payoutActionHint}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Recent Settlement Proof">
            <div className="space-y-4">
              {transactionProofs.length === 0 ? (
                <EmptyState
                  title="No releases yet"
                  description="Release proof events will surface here as milestones move through settlement."
                />
              ) : (
                transactionProofs.slice(0, 2).map((proof) => {
                  const milestone = milestones.find(
                    (item) => item.id === proof.milestoneId,
                  );
                  const proofActionLabel = proof.status === "failed"
                    ? "Retry payout flow"
                    : proof.status === "pending"
                      ? "Track settlement"
                      : "Open payout proof";
                  const proofActionHint = proof.status === "failed"
                    ? "Open the payout to inspect the failed release and decide whether to retry."
                    : proof.status === "pending"
                      ? "Open the payout to monitor confirmation and refresh proof state."
                      : "Open the payout detail to review the full settlement record."
                  return (
                    <div
                      key={proof.id}
                      className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.72)] p-5"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold text-white">
                            {milestone?.title ?? "Settlement event"}
                          </p>
                          <MilestoneStatusBadge status={proof.status === "confirmed" ? "released" : proof.status === "failed" ? "rejected" : "submitted"} />
                        </div>
                        <p className="text-sm text-[var(--text-primary)]">
                          {formatUsdc(milestone?.amount ?? 0)} USDC · {proof.network ?? "Arc Testnet"}
                        </p>
                        <p className="break-all font-mono text-xs leading-6 text-cyan-100">
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
                            <div className="rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
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
        </div>
      </div>
    </div>
  );
}
