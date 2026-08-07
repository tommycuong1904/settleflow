"use client";

import { useMemo, useState } from "react";

import { ARC_CONFIG } from "@/lib/arc/config";
import { mapSendResultToProof } from "@/lib/arc/map-send-result-to-proof";
import {
  ReleasePanel,
  type ReleasePanelStatus,
} from "@/components/payouts/release-panel";
import { TransactionProofCard } from "@/components/payouts/transaction-proof-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Milestone } from "@/lib/models/milestone";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import { formatUsdc } from "@/lib/utils/format";

type PayoutDetailReleaseShellProps = {
  payoutId: string;
  recipientAddress?: string;
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
  recipientAddress,
  nextReleasableMilestone,
  releaseProof,
  onReleaseSuccess,
}: PayoutDetailReleaseShellProps) {
  const [releaseStatus, setReleaseStatus] = useState<ReleasePanelStatus>(
    releaseProof ? "confirmed" : "idle",
  );
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [activeProof, setActiveProof] = useState<TransactionProof | undefined>(releaseProof);

  const resolvedProof = activeProof ?? releaseProof;
  const effectiveReleaseStatus =
    resolvedProof && releaseStatus !== "failed" ? "confirmed" : releaseStatus;

  const statusText = useMemo(() => {
    switch (effectiveReleaseStatus) {
      case "submitting":
        return "SettleFlow is preparing the Arc payout release and proof update.";
      case "confirmed":
        return "Release completed. The latest milestone now shows a refreshed Arc settlement proof.";
      case "failed":
        return releaseError ?? "Release flow hit an error before proof could be attached.";
      case "idle":
      default:
        return nextReleasableMilestone
          ? "This milestone is approved and ready for a sequential USDC release on Arc."
          : "No approved milestone is ready for release yet.";
    }
  }, [effectiveReleaseStatus, nextReleasableMilestone, releaseError]);

  async function handleRelease() {
    if (!nextReleasableMilestone) {
      return;
    }

    setReleaseError(null);
    setReleaseStatus("submitting");

    try {
      const response = await fetch(`/api/v1/milestones/${nextReleasableMilestone.id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggeredByUserId: "user-reviewer",
          amountUsdc: String(nextReleasableMilestone.amount),
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        release?: { id: string; status: string; txHash?: string };
        proof?: {
          id: string;
          milestoneId: string;
          txHash?: string;
          network?: string;
          status: string;
          explorerUrl?: string;
          confirmedAt?: string;
        };
      };

      if (!response.ok || data.error) {
        setReleaseError(data.error ?? "Release request failed.");
        setReleaseStatus("failed");
        return;
      }

      const result = mapSendResultToProof(
        {
          result: {
            status:
              data.release?.status === "confirmed"
                ? "confirmed"
                : data.release?.status === "failed"
                  ? "failed"
                  : "pending",
            txHash: data.proof?.txHash,
            explorerUrl: data.proof?.explorerUrl,
            network: data.proof?.network,
            confirmedAt: data.proof?.confirmedAt,
          },
          milestoneId: nextReleasableMilestone.id,
        },
      );

      if (!result) {
        setReleaseError("Release succeeded but proof could not be mapped.");
        setReleaseStatus("failed");
        return;
      }

      const releasedAt = result.confirmedAt ?? new Date().toISOString();

      setActiveProof(result);
      onReleaseSuccess?.({
        milestoneId: nextReleasableMilestone.id,
        proof: result,
        releasedAt,
      });

      setReleaseStatus("confirmed");
    } catch (err) {
      setReleaseError(
        err instanceof Error ? err.message : "Release request failed.",
      );
      setReleaseStatus("failed");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="sf-shell">
        <CardHeader>
          <CardTitle>Release Target</CardTitle>
          <CardDescription>Keep the release action, recipient context, and Arc execution mode in one place.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-[var(--text-primary)]">
          <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.74)] p-4">
            <p className="font-semibold text-white">
              {nextReleasableMilestone
                ? nextReleasableMilestone.title
                : resolvedProof
                  ? "Latest released milestone"
                  : "No release available yet"}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {nextReleasableMilestone
                ? `${formatUsdc(nextReleasableMilestone.amount)} USDC`
                : resolvedProof
                  ? "Released"
                  : "0 USDC"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">
              {ARC_CONFIG.executionMode === "real"
                ? "Arc Testnet • Live execution path"
                : ARC_CONFIG.executionMode === "demo"
                  ? "Arc Testnet • Demo-confirmed execution path"
                  : "Arc Testnet • Mock execution path"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Recipient: {recipientAddress ?? "Demo wallet not provided yet"}
            </p>
          </div>
          <ReleasePanel
            amount={nextReleasableMilestone?.amount ?? 0}
            network={`Arc Testnet (${ARC_CONFIG.executionMode})`}
            enabled={Boolean(nextReleasableMilestone) || Boolean(resolvedProof)}
            status={effectiveReleaseStatus}
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
        </CardContent>
      </Card>

      <Card className="sf-shell">
        <CardHeader>
          <CardTitle>Settlement Proof</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionProofCard proof={resolvedProof} />
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
          {ARC_CONFIG.executionMode === "real"
            ? "Real wallet execution is the intended final path, but the live Arc transfer wiring is not complete in this repo yet."
            : ARC_CONFIG.executionMode === "demo"
              ? "This proof is generated through the demo-confirmed Arc path so judges can verify release sequencing, recipient context, and proof attachment end-to-end."
              : "This proof is generated through the mock Arc path to keep the review-to-release story demo-safe while the live settlement path remains scaffolded."}
        </div>
        </CardContent>
      </Card>

      <Card className="sf-shell">
        <CardHeader>
          <CardTitle>How SettleFlow works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-[var(--text-primary)]">
          {[
            "Contributor submits work against a milestone.",
            "Reviewer approves the milestone before release.",
            "Approved funds move in USDC on Arc, then refresh the settlement proof attached to the payout.",
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
        </CardContent>
      </Card>
    </div>
  );
}
