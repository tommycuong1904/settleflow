"use client";

import { useMemo, useState } from "react";

import { ARC_CONFIG } from "@/lib/arc/config";
import { mapSendResultToProof } from "@/lib/arc/map-send-result-to-proof";
import {
  ReleasePanel,
  type ReleasePanelStatus,
} from "@/components/payouts/release-panel";
import { TransactionProofCard } from "@/components/payouts/transaction-proof-card";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Milestone } from "@/lib/models/milestone";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { formatUsdc } from "@/lib/utils/format";

type PayoutDetailReleaseShellProps = {
  payoutId: string;
  recipientAddress?: string;
  nextReleasableMilestone?: Milestone;
  releaseMilestoneTitle?: string;
  releaseProof?: TransactionProof;
  onReleaseSuccess?: (payload: {
    milestoneId: string;
    proof: TransactionProof;
    releasedAt: string;
  }) => void;
  onActivityChange?: () => void | Promise<void>;
};

export function PayoutDetailReleaseShell({
  payoutId,
  recipientAddress,
  nextReleasableMilestone,
  releaseMilestoneTitle,
  releaseProof,
  onReleaseSuccess,
  onActivityChange,
}: PayoutDetailReleaseShellProps) {
  const productContext = useResolvedProductContext();
  const isOwnerActor = productContext.actor === "owner";
  const [releaseStatus, setReleaseStatus] = useState<ReleasePanelStatus>(
    releaseProof?.status === "failed"
      ? "failed"
      : releaseProof?.status === "pending"
        ? "submitting"
        : releaseProof?.status === "confirmed"
          ? "confirmed"
          : "idle",
  );
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [retryingRelease, setRetryingRelease] = useState(false);
  const [refreshingProof, setRefreshingProof] = useState(false);
  const [confirmationTxHash, setConfirmationTxHash] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [activeProof, setActiveProof] = useState<TransactionProof | undefined>(releaseProof);

  const resolvedProof = activeProof ?? releaseProof;
  const proofMatchesCurrentMilestone =
    resolvedProof && nextReleasableMilestone
      ? resolvedProof.milestoneId === nextReleasableMilestone.id
      : Boolean(resolvedProof);
  const effectiveReleaseStatus =
    resolvedProof && proofMatchesCurrentMilestone
      ? resolvedProof.status === "failed"
        ? "failed"
        : resolvedProof.status === "pending"
          ? "submitting"
          : "confirmed"
      : releaseStatus;
  const releaseActionEnabled = effectiveReleaseStatus !== "failed";
  const releaseActionLabel =
    effectiveReleaseStatus === "failed"
      ? "Retry from proof panel"
      : undefined;

  const statusText = useMemo(() => {
    switch (effectiveReleaseStatus) {
      case "submitting":
        return "SettleFlow is preparing the Arc release and waiting for the settlement proof update.";
      case "confirmed":
        return "Release completed. Review the proof below, then continue with the next approved milestone if one is ready.";
      case "failed":
        return releaseError ?? "Release failed before settlement proof could be attached. Retry after checking the current payout state.";
      case "idle":
      default:
        return nextReleasableMilestone
          ? "This milestone is approved and can be released now. Trigger release here after confirming the recipient and amount."
          : "No approved milestone is ready for release yet. Approve a submitted milestone first to unlock this panel.";
    }
  }, [effectiveReleaseStatus, nextReleasableMilestone, releaseError]);

  async function handleRelease() {
    if (!isOwnerActor || !nextReleasableMilestone) {
      return;
    }

    setReleaseError(null);
    setReleaseStatus("submitting");

    try {
      const response = await fetch(`/api/v1/milestones/${nextReleasableMilestone.id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsdc: String(nextReleasableMilestone.amount),
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        release?: { id: string; status: string; txHash?: string };
        proof?: {
          id: string;
          releaseId?: string;
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
          releaseId: data.proof?.releaseId ?? data.release?.id,
        },
      );

      if (!result) {
        setReleaseError("Release succeeded but proof could not be mapped.");
        setReleaseStatus("failed");
        return;
      }

      setActiveProof(result);
      if (result.status === "confirmed") {
        onReleaseSuccess?.({
          milestoneId: nextReleasableMilestone.id,
          proof: result,
          releasedAt: result.confirmedAt ?? new Date().toISOString(),
        });
      }

      void onActivityChange?.();
      setReleaseStatus(result.status === "failed" ? "failed" : result.status === "pending" ? "submitting" : "confirmed");
    } catch (err) {
      setReleaseError(
        err instanceof Error ? err.message : "Release request failed.",
      );
      setReleaseStatus("failed");
    }
  }

  async function handleRetryRelease() {
    if (!isOwnerActor || !resolvedProof?.releaseId || retryingRelease) {
      return;
    }

    setReleaseError(null);
    setRetryingRelease(true);

    try {
      const response = await fetch(`/api/v1/releases/${resolvedProof.releaseId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as {
        error?: string;
        release?: { id: string; status: string };
        proof?: { id: string; releaseId?: string; status: string };
      };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Retry release request failed.");
      }

      setActiveProof((current) =>
        current
          ? {
              ...current,
              id: data.proof?.id ?? current.id,
              releaseId: data.proof?.releaseId ?? data.release?.id ?? current.releaseId,
              status: "pending",
              txHash: "",
              explorerUrl: "",
              confirmedAt: undefined,
            }
          : current,
      );
      setConfirmationTxHash("");
      setFailureReason("");
      setReleaseStatus("submitting");
      void onActivityChange?.();
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : "Retry release request failed.");
      setReleaseStatus("failed");
    } finally {
      setRetryingRelease(false);
    }
  }

  async function handleRefreshProof(status: "confirmed" | "failed") {
    if (!isOwnerActor || !resolvedProof?.releaseId || refreshingProof) {
      return;
    }

    const txHash = confirmationTxHash.trim();
    const reason = failureReason.trim();

    if (status === "confirmed" && txHash.length === 0) {
      setReleaseError("Tx hash is required to confirm settlement proof.");
      return;
    }

    if (status === "failed" && reason.length === 0) {
      setReleaseError("Failure reason is required to mark settlement proof as failed.");
      return;
    }

    setReleaseError(null);
    setRefreshingProof(true);

    try {
      const response = await fetch(`/api/v1/releases/${resolvedProof.releaseId}/proof/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          txHash: status === "confirmed" ? txHash : undefined,
          network: status === "confirmed" ? "Arc Testnet" : undefined,
          failureReason: status === "failed" ? reason : undefined,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        proof?: {
          id: string;
          releaseId?: string;
          milestoneId?: string;
          txHash?: string | null;
          network?: string | null;
          status: "pending" | "confirmed" | "failed";
          explorerUrl?: string | null;
          confirmedAt?: string | null;
          failureReason?: string | null;
        };
      };

      if (!response.ok || data.error || !data.proof) {
        throw new Error(data.error ?? "Proof refresh request failed.");
      }

      const proof = data.proof;
      const resolvedMilestoneId = proof.milestoneId ?? resolvedProof.milestoneId;
      const baseProof: TransactionProof = resolvedProof
        ? resolvedProof
        : {
            id: proof.id,
            releaseId: proof.releaseId,
            milestoneId: resolvedMilestoneId,
            txHash: "",
            network: proof.network ?? "Arc Testnet",
            status: proof.status,
            explorerUrl: "",
          };
      const updatedProof: TransactionProof = {
        ...baseProof,
        id: proof.id,
        releaseId: proof.releaseId ?? baseProof.releaseId,
        milestoneId: resolvedMilestoneId,
        status: proof.status,
        txHash: proof.txHash ?? "",
        network: proof.network ?? baseProof.network ?? "Arc Testnet",
        explorerUrl: proof.explorerUrl ?? "",
        confirmedAt: proof.confirmedAt ?? undefined,
        failureReason: proof.failureReason ?? undefined,
      };

      setActiveProof(updatedProof);
      setReleaseStatus(status === "failed" ? "failed" : "confirmed");
      if (status === "confirmed") {
        onReleaseSuccess?.({
          milestoneId: resolvedMilestoneId,
          proof: updatedProof,
          releasedAt: proof.confirmedAt ?? new Date().toISOString(),
        });
        setConfirmationTxHash("");
      }
      if (status === "failed") {
        setFailureReason("");
        void onActivityChange?.();
      }
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : "Proof refresh request failed.");
      setReleaseStatus("failed");
    } finally {
      setRefreshingProof(false);
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
                  ? "Arc Testnet • Staged execution path"
                  : "Arc Testnet • Mock execution path"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Recipient: {recipientAddress ?? "Recipient address not resolved yet"}
            </p>
          </div>
          <ReleasePanel
            amount={nextReleasableMilestone?.amount ?? 0}
            network={`Arc Testnet (${ARC_CONFIG.executionMode})`}
            enabled={isOwnerActor && (Boolean(nextReleasableMilestone) || Boolean(resolvedProof))}
            actionEnabled={releaseActionEnabled}
            actionLabel={releaseActionLabel}
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
          <TransactionProofCard proof={resolvedProof} milestoneTitle={releaseMilestoneTitle} />
          {resolvedProof?.status === "pending" && resolvedProof.releaseId && isOwnerActor ? (
            <div className="mt-4 space-y-4 rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.42)] p-4">
              <div>
                <p className="text-sm font-semibold text-white">Refresh pending settlement</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Confirm the proof when the Arc transfer lands, or mark it failed to unblock a retry.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Confirm with tx hash
                  </label>
                  <Input
                    value={confirmationTxHash}
                    onChange={(event) => setConfirmationTxHash(event.target.value)}
                    placeholder="0x..."
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      void handleRefreshProof("confirmed");
                    }}
                    disabled={refreshingProof}
                  >
                    {refreshingProof ? "Updating..." : "Mark confirmed"}
                  </Button>
                </div>
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Mark failed
                  </label>
                  <Textarea
                    value={failureReason}
                    onChange={(event) => setFailureReason(event.target.value)}
                    placeholder="Why did this settlement fail?"
                    className="min-h-24"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      void handleRefreshProof("failed");
                    }}
                    disabled={refreshingProof}
                  >
                    {refreshingProof ? "Updating..." : "Mark failed"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {resolvedProof?.status === "failed" && resolvedProof.releaseId && isOwnerActor ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => { void handleRetryRelease(); }} disabled={retryingRelease}>
                {retryingRelease ? "Retrying..." : "Retry release"}
              </Button>
              <p className="text-sm text-[var(--text-muted)]">
                Queue a fresh release attempt for this failed settlement.
              </p>
            </div>
          ) : null}
          {!isOwnerActor ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
              Release, proof refresh, and retry controls are only available in the owner view.
            </div>
          ) : null}
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
          {ARC_CONFIG.executionMode === "real"
            ? "Real wallet execution is the intended final path, but the live Arc transfer wiring is not complete in this repository yet."
            : ARC_CONFIG.executionMode === "demo"
              ? "This proof comes from the current staged Arc path while live settlement execution is still being completed."
              : "This proof comes from the current mock Arc path while live settlement execution is still being completed."}
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
