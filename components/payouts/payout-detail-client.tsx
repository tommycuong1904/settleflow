"use client";

import { useMemo, useState } from "react";

import { StatCard } from "@/components/dashboard/stat-card";
import { MilestoneRow } from "@/components/milestones/milestone-row";
import { PayoutDetailReleaseShell } from "@/components/payouts/payout-detail-release-shell";
import { SectionCard } from "@/components/shared/section-card";
import type { Contributor } from "@/lib/models/contributor";
import type { Milestone } from "@/lib/models/milestone";
import type { Payout } from "@/lib/models/payout";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";

type PersistedReleaseState = {
  releasedMilestoneId: string;
  proof: TransactionProof;
  releasedAt: string;
};

type PayoutDetailClientProps = {
  payout: Payout;
  contributor?: Contributor;
  initialMilestones: Milestone[];
  initialReleaseProof?: TransactionProof;
};

function getStorageKey(payoutId: string) {
  return `settleflow:release:${payoutId}`;
}

export function PayoutDetailClient({
  payout,
  contributor,
  initialMilestones,
  initialReleaseProof,
}: PayoutDetailClientProps) {
  const [persistedRelease, setPersistedRelease] = useState<PersistedReleaseState | null>(() => {
    if (typeof window === "undefined") return null;

    const stored = window.sessionStorage.getItem(getStorageKey(payout.id));
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored) as PersistedReleaseState;
      return parsed?.releasedMilestoneId && parsed?.proof?.milestoneId ? parsed : null;
    } catch {
      window.sessionStorage.removeItem(getStorageKey(payout.id));
      return null;
    }
  });
  const [milestoneState, setMilestoneState] = useState(() => initialMilestones);

  const milestones = useMemo(() => {
    if (!persistedRelease) {
      return milestoneState;
    }

    return milestoneState.map((milestone) =>
      milestone.id === persistedRelease.releasedMilestoneId
        ? {
            ...milestone,
            status: "released" as const,
            releasedAt: persistedRelease.releasedAt,
          }
        : milestone,
    );
  }, [milestoneState, persistedRelease]);

  const releaseProof = persistedRelease?.proof ?? initialReleaseProof;

  const latestReleasedMilestone = releaseProof
    ? milestones.find((milestone) => milestone.id === releaseProof.milestoneId)
    : milestones.findLast((milestone) => milestone.status === "released");

  const nextReleasableMilestone = milestones.find(
    (milestone) => milestone.status === "approved",
  );

  const releasedCount = milestones.filter(
    (milestone) => milestone.status === "released",
  ).length;
  const amountReleased = milestones
    .filter((milestone) => milestone.status === "released")
    .reduce((sum, milestone) => sum + milestone.amount, 0);
  const submittedCount = milestones.filter(
    (milestone) => milestone.status === "submitted",
  ).length;
  const readyToReleaseCount = milestones.filter(
    (milestone) => milestone.status === "approved",
  ).length;

  const payoutStatusLabel =
    payout.status === "partially_released"
      ? "Partially released"
      : payout.status === "active"
        ? amountReleased > 0
          ? "Partially released"
          : "In progress"
        : payout.status.replace("_", " ");

  function handleApproveMilestone(milestoneId: string) {
    setMilestoneState((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId && milestone.status === "submitted"
          ? { ...milestone, status: "approved" as const }
          : milestone,
      ),
    );
  }

  function handleRejectMilestone(milestoneId: string) {
    setMilestoneState((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId && milestone.status === "submitted"
          ? { ...milestone, status: "rejected" as const }
          : milestone,
      ),
    );
  }

  function handleReleaseSuccess(payload: { milestoneId: string; proof: TransactionProof; releasedAt: string }) {
    const nextState: PersistedReleaseState = {
      releasedMilestoneId: payload.milestoneId,
      proof: payload.proof,
      releasedAt: payload.releasedAt,
    };

    setPersistedRelease(nextState);
    setMilestoneState((current) =>
      current.map((milestone) =>
        milestone.id === payload.milestoneId
          ? {
              ...milestone,
              status: "released" as const,
              releasedAt: payload.releasedAt,
            }
          : milestone,
      ),
    );
    window.sessionStorage.setItem(getStorageKey(payout.id), JSON.stringify(nextState));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
          Payout detail
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {payout.title}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-primary)] md:text-base">
            Review milestone submissions, approve release in sequence, and keep
            Arc settlement proof attached to the payout flow.
          </p>
        </div>
      </div>

      <SectionCard title="Payout Summary">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Contributor", value: contributor?.name ?? payout.contributorId },
            {
              label: "Wallet",
              value: contributor ? shortenAddress(contributor.walletAddress) : "Unknown",
            },
            { label: "Total amount", value: `${formatUsdc(payout.totalAmount)} USDC` },
            {
              label: "Payout status",
              value: payoutStatusLabel,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {item.label}
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Milestones" value={milestones.length} />
        <StatCard label="Awaiting review" value={submittedCount} />
        <StatCard label="Ready to release" value={readyToReleaseCount} />
        <StatCard
          label="Released"
          value={`${formatUsdc(amountReleased)} USDC`}
          hint={`${releasedCount} milestone${releasedCount === 1 ? "" : "s"} already settled on Arc`}
        />
        <StatCard
          label="Latest release"
          value={latestReleasedMilestone ? latestReleasedMilestone.title : "Not released yet"}
          hint={
            releaseProof?.confirmedAt
              ? `Confirmed ${new Date(releaseProof.confirmedAt).toLocaleString()}`
              : releaseProof
                ? "Proof attached to latest payout event"
                : "Release the next approved milestone to attach proof"
          }
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Milestone Workflow">
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <MilestoneRow
                key={milestone.id}
                milestone={milestone}
                onApprove={handleApproveMilestone}
                onReject={handleRejectMilestone}
              />
            ))}
          </div>
        </SectionCard>

        <PayoutDetailReleaseShell
          payoutId={payout.id}
          recipientAddress={contributor?.walletAddress}
          nextReleasableMilestone={nextReleasableMilestone}
          releaseProof={releaseProof}
          onReleaseSuccess={handleReleaseSuccess}
        />
      </div>
    </div>
  );
}
