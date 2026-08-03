"use client";

import { useEffect, useMemo, useState } from "react";

import { mapSendResultToProof } from "@/lib/arc/map-send-result-to-proof";
import { sendUsdcOnArc } from "@/lib/arc/send";
import {
  ReleasePanel,
  type ReleasePanelStatus,
} from "@/components/payouts/release-panel";
import { TransactionProofCard } from "@/components/payouts/transaction-proof-card";
import { SectionCard } from "@/components/shared/section-card";
import type { Milestone } from "@/lib/models/milestone";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import { formatUsdc } from "@/lib/utils/format";

type PayoutDetailReleaseShellProps = {
  payoutId: string;
  nextReleasableMilestone?: Milestone;
  releaseProof?: TransactionProof;
  onReleaseSuccess?: (payload: {
    milestoneId: string;
    proof: TransactionProof;
    releasedAt: string;
  }) => void;
};

export function PayoutDetailReleaseShell({
  payoutId,
  nextReleasableMilestone,
  releaseProof,
  onReleaseSuccess,
}: PayoutDetailReleaseShellProps) {
  const [releaseStatus, setReleaseStatus] = useState<ReleasePanelStatus>(
    releaseProof ? "confirmed" : "idle",
  );
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [activeProof, setActiveProof] = useState<TransactionProof | undefined>(releaseProof);

  useEffect(() => {
    if (releaseProof) {
      setActiveProof(releaseProof);
      setReleaseStatus("confirmed");
      setReleaseError(null);
      return;
    }

    if (!nextReleasableMilestone) {
      setActiveProof(undefined);
      setReleaseStatus("idle");
    }
  }, [nextReleasableMilestone, releaseProof]);

  const statusText = useMemo(() => {
    switch (releaseStatus) {
      case "submitting":
        return "Release flow is actively running.";
      case "confirmed":
        return "Release completed and proof has been refreshed.";
      case "failed":
        return releaseError ?? "Release flow hit an error.";
      case "idle":
      default:
        return nextReleasableMilestone ? null : "No approved milestone is ready yet.";
    }
  }, [nextReleasableMilestone, releaseError, releaseStatus]);

  async function handleRelease() {
    if (!nextReleasableMilestone) {
      return;
    }

    setReleaseError(null);
    setReleaseStatus("submitting");

    const result = await sendUsdcOnArc({
      recipient: "0x0000000000000000000000000000000000000000",
      amount: nextReleasableMilestone.amount,
      tokenAddress: "USDC",
      payoutId,
      milestoneId: nextReleasableMilestone.id,
      note: nextReleasableMilestone.title,
    });

    if (result.status === "failed") {
      setReleaseError(result.errorMessage ?? "Release failed.");
      setReleaseStatus("failed");
      return;
    }

    const mappedProof = mapSendResultToProof({
      result,
      milestoneId: nextReleasableMilestone.id,
    });

    const releasedAt = result.confirmedAt ?? new Date().toISOString();

    if (mappedProof) {
      setActiveProof(mappedProof);
      onReleaseSuccess?.({
        milestoneId: nextReleasableMilestone.id,
        proof: mappedProof,
        releasedAt,
      });
    }

    setReleaseStatus(result.status === "confirmed" ? "confirmed" : "submitting");
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Release Target">
        <div className="space-y-4 text-sm text-[var(--text-primary)]">
          <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.74)] p-4">
            <p className="font-semibold text-white">
              {nextReleasableMilestone
                ? nextReleasableMilestone.title
                : activeProof
                  ? "Latest released milestone"
                  : "No release available yet"}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {nextReleasableMilestone
                ? `${formatUsdc(nextReleasableMilestone.amount)} USDC`
                : activeProof
                  ? "Released"
                  : "0 USDC"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">
              Arc Testnet • Asset: USDC
            </p>
          </div>
          <ReleasePanel
            amount={nextReleasableMilestone?.amount ?? 0}
            network="Arc Testnet"
            enabled={Boolean(nextReleasableMilestone) || Boolean(activeProof)}
            status={releaseStatus}
            errorMessage={releaseError}
            onRelease={() => {
              void handleRelease();
            }}
          />
          {statusText ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
              {statusText}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Settlement Proof">
        <TransactionProofCard proof={activeProof} />
      </SectionCard>

      <SectionCard title="How SettleFlow works">
        <div className="space-y-3 text-sm text-[var(--text-primary)]">
          {[
            "Contributor submits work against a milestone.",
            "Reviewer approves the milestone before release.",
            "Approved funds move in USDC on Arc and attach transaction proof.",
          ].map((item, index) => (
            <div
              key={item}
              className="flex gap-3 rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.56)] p-4"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                {index + 1}
              </div>
              <p className="leading-6">{item}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
