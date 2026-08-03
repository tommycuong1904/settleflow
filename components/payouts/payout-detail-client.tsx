"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [persistedRelease, setPersistedRelease] = useState<PersistedReleaseState | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(getStorageKey(payout.id));
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as PersistedReleaseState;
      if (parsed?.releasedMilestoneId && parsed?.proof?.milestoneId) {
        setPersistedRelease(parsed);
      }
    } catch {
      window.sessionStorage.removeItem(getStorageKey(payout.id));
    }
  }, [payout.id]);

  const milestones = useMemo(() => {
    if (!persistedRelease) {
      return initialMilestones;
    }

    return initialMilestones.map((milestone) =>
      milestone.id === persistedRelease.releasedMilestoneId
        ? {
            ...milestone,
            status: "released" as const,
            releasedAt: persistedRelease.releasedAt,
          }
        : milestone,
    );
  }, [initialMilestones, persistedRelease]);

  const releaseProof = persistedRelease?.proof ?? initialReleaseProof;

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

  function handleReleaseSuccess(payload: { milestoneId: string; proof: TransactionProof; releasedAt: string }) {
    const nextState: PersistedReleaseState = {
      releasedMilestoneId: payload.milestoneId,
      proof: payload.proof,
      releasedAt: payload.releasedAt,
    };

    setPersistedRelease(nextState);
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

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Milestones" value={milestones.length} />
        <StatCard label="Awaiting review" value={submittedCount} />
        <StatCard label="Ready to release" value={readyToReleaseCount} />
        <StatCard
          label="Released"
          value={`${formatUsdc(amountReleased)} USDC`}
          hint={`${releasedCount} milestone${releasedCount === 1 ? "" : "s"} already settled on Arc`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Milestone Workflow">
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <MilestoneRow key={milestone.id} milestone={milestone} />
            ))}
          </div>
        </SectionCard>

        <PayoutDetailReleaseShell
          payoutId={payout.id}
          nextReleasableMilestone={nextReleasableMilestone}
          releaseProof={releaseProof}
          onReleaseSuccess={handleReleaseSuccess}
        />
      </div>
    </div>
  );
}
