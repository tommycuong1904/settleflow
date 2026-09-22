"use client";

import { useMemo, useState } from "react";

import { ARC_CONFIG } from "@/lib/arc/config";
import {
  BrowserWalletPreBroadcastError,
  BrowserWalletSubmissionUnknownError,
  sendUsdcWithBrowserWallet,
} from "@/lib/arc/browser-wallet";
import { executeCircleChallenge, type CircleSdkChallenge } from "@/lib/circle/user-controlled-client";
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
import { PRODUCT_CONTEXT_HEADER_NAMES, type ProductActor } from "@/lib/runtime/product-context";
import { hasRole, isRole } from "@/lib/runtime/role-utils";
import { useWallet } from "@/lib/context/wallet-context";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";

type PayoutDetailReleaseShellProps = {
  payoutId: string;
  recipientAddress?: string;
  nextReleasableMilestone?: Milestone;
  releaseMilestoneTitle?: string;
  releaseProof?: TransactionProof;
  currentActor: ProductActor;
  onReleaseSuccess?: (payload: {
    milestoneId: string;
    proof: TransactionProof;
    releasedAt: string;
  }) => void;
  onActivityChange?: () => void | Promise<void>;
};

type CircleReleasePayload = {
  error?: string;
  status?: "pending" | "confirmed" | "failed";
  phase?: "confirmation" | "settlement";
  release?: { id: string; status: string; txHash?: string; arcRequestId?: string };
  proof?: {
    id: string;
    releaseId?: string;
    milestoneId?: string;
    txHash?: string;
    network?: string;
    status: "pending" | "confirmed" | "failed";
    explorerUrl?: string;
    confirmedAt?: string;
    failedAt?: string;
    failureReason?: string;
    executionMode?: TransactionProof["executionMode"];
    releaseTxHash?: string;
    releaseArcRequestId?: string;
  };
};

function proofFromCirclePayload(
  payload: CircleReleasePayload,
  fallback: TransactionProof,
): TransactionProof | undefined {
  if (!payload.proof) return undefined;
  return {
    ...fallback,
    ...payload.proof,
    milestoneId: payload.proof.milestoneId ?? fallback.milestoneId,
    releaseId: payload.proof.releaseId ?? payload.release?.id ?? fallback.releaseId,
    txHash: payload.proof.txHash ?? "",
    network: payload.proof.network ?? "Arc Testnet",
    explorerUrl: payload.proof.explorerUrl ?? "",
    executionMode: payload.proof.executionMode ?? "circle_user_wallet",
    releaseTxHash: payload.proof.releaseTxHash ?? payload.release?.txHash,
    releaseArcRequestId: payload.proof.releaseArcRequestId ?? payload.release?.arcRequestId,
  };
}

function releaseErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (message === "CIRCLE_WALLET_PROVIDER_ERROR") {
    return "Circle is temporarily unavailable. This release remains pending; retry the current confirmation or settlement refresh without creating a new release.";
  }
  return message;
}

export function PayoutDetailReleaseShell({
  payoutId,
  recipientAddress,
  nextReleasableMilestone,
  releaseMilestoneTitle,
  releaseProof,
  currentActor,
  onReleaseSuccess,
  onActivityChange,
}: PayoutDetailReleaseShellProps) {
  const productContext = useResolvedProductContext();
  const { isConnected, address, authType, openAuthModal } = useWallet();
  const isOwnerActor = isRole(currentActor, "owner");
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
  const isPendingCircleRelease = Boolean(
    resolvedProof?.status === "pending" &&
    resolvedProof.releaseId &&
    resolvedProof.executionMode === "circle_user_wallet",
  );
  const isCircleSettlementPending = Boolean(
    isPendingCircleRelease && (resolvedProof?.releaseTxHash || resolvedProof?.releaseArcRequestId),
  );
  const needsCircleConfirmation = isPendingCircleRelease && !isCircleSettlementPending;
  const isBrowserReleasable = Boolean(
    resolvedProof?.status === "pending" &&
    resolvedProof.releaseId &&
    resolvedProof.executionMode === "browser_wallet" &&
    resolvedProof.releaseStatus === "queued",
  );
  const isBrowserReconciliationPending = Boolean(
    resolvedProof?.status === "pending" &&
    resolvedProof.executionMode === "browser_wallet" &&
    resolvedProof.releaseStatus === "pending",
  );
  const releaseActionEnabled = effectiveReleaseStatus !== "failed" && !isBrowserReconciliationPending;
  const releaseActionLabel = isCircleSettlementPending
    ? "Refresh Circle settlement"
    : needsCircleConfirmation
      ? "Continue Circle confirmation"
      : isBrowserReleasable
        ? "Continue Web3 release"
        : isBrowserReconciliationPending
          ? "Await Web3 reconciliation"
      : effectiveReleaseStatus === "failed"
      ? "Retry from proof panel"
      : undefined;

  const statusText = useMemo(() => {
    if (releaseError) return releaseError;
    if (isCircleSettlementPending) {
      return "Circle submitted the transaction. Refresh its settlement status without creating or signing another transaction.";
    }
    if (needsCircleConfirmation) {
      return "Circle confirmation is waiting. Continue with the existing confirmation; SettleFlow will not create another release.";
    }
    if (isBrowserReconciliationPending) {
      return "Wallet submission may have been broadcast. Check wallet activity and confirm with its transaction hash; retry is locked to prevent duplicate payment.";
    }
    switch (effectiveReleaseStatus) {
      case "submitting":
        return "SettleFlow is preparing the Arc release and waiting for the settlement proof update.";
      case "confirmed":
        return nextReleasableMilestone
          ? "Release completed. Review the proof below, then continue with the next approved milestone when you are ready."
          : "Release completed. Review the proof below and return after the next milestone is approved for settlement.";
      case "failed":
        return releaseError ?? "Release failed before settlement proof could be attached. Retry after checking the current payout state.";
      case "idle":
      default:
        return nextReleasableMilestone
          ? "This milestone is approved and can be released now. Trigger release here after confirming the recipient and amount."
          : "No approved milestone is ready for release yet. Approve a submitted milestone first to unlock this panel.";
    }
  }, [effectiveReleaseStatus, isBrowserReconciliationPending, isCircleSettlementPending, needsCircleConfirmation, nextReleasableMilestone, releaseError]);

  const productContextHeaders = useMemo(
    () => ({
      [PRODUCT_CONTEXT_HEADER_NAMES.workspaceId]: productContext.workspaceId,
      [PRODUCT_CONTEXT_HEADER_NAMES.ownerUserId]: productContext.ownerUserId,
      [PRODUCT_CONTEXT_HEADER_NAMES.reviewerUserId]: productContext.reviewerUserId,
      [PRODUCT_CONTEXT_HEADER_NAMES.contributorUserId]: productContext.contributorUserId,
      [PRODUCT_CONTEXT_HEADER_NAMES.actor]: productContext.actor,
    }),
    [productContext.actor, productContext.contributorUserId, productContext.ownerUserId, productContext.reviewerUserId, productContext.workspaceId],
  );

  async function completeCircleRelease(releaseId: string) {
    const completed = await fetch(`/api/v1/releases/${releaseId}/circle/complete`, {
      method: "POST",
      headers: productContextHeaders,
    });
    const completedPayload = (await completed.json()) as CircleReleasePayload;
    if (!completed.ok && completed.status !== 202) throw new Error(completedPayload.error ?? "Circle wallet release failed.");
    return completedPayload;
  }

  async function executeCircleRelease(releaseId: string) {
    const challengeResponse = await fetch(`/api/v1/releases/${releaseId}/circle/challenge`, {
      method: "POST",
      headers: productContextHeaders,
    });
    const challengePayload = (await challengeResponse.json()) as { error?: string; challenge?: CircleSdkChallenge };
    if (!challengeResponse.ok || challengePayload.error || !challengePayload.challenge) {
      throw new Error(challengePayload.error ?? "Unable to prepare Circle wallet confirmation.");
    }
    try {
      await executeCircleChallenge(challengePayload.challenge);
    } catch (error) {
      // The SDK can reject after Circle accepted the confirmation. Read the
      // authoritative server state before treating it as a failed attempt.
      try {
        const reconciled = await completeCircleRelease(releaseId);
        if (reconciled.status !== "pending" || reconciled.phase === "settlement") {
          return reconciled;
        }
      } catch {
        // Preserve the original SDK error when reconciliation is unavailable.
      }
      throw error;
    }
    return completeCircleRelease(releaseId);
  }

  async function handleRelease(resumeReleaseId?: string) {
    if (!isConnected) {
      openAuthModal();
      return;
    }

    if (!hasRole(currentActor, "owner") || !nextReleasableMilestone) {
      return;
    }

    setReleaseError(null);
    setReleaseStatus("submitting");

    try {
      if (authType !== "web3_wallet") {
        throw new Error("Connect an enabled Web3 wallet to release from a browser wallet.");
      }
      const response = resumeReleaseId
        ? null
        : await fetch(`/api/v1/milestones/${nextReleasableMilestone.id}/release`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...productContextHeaders,
        },
        body: JSON.stringify({
          amountUsdc: String(nextReleasableMilestone.amount),
          executionMode: "browser_wallet",
        }),
      });

      const data = response ? (await response.json()) as {
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
      } : {
        release: { id: resumeReleaseId!, status: "queued" },
        proof: {
          id: resolvedProof?.id ?? `proof-${nextReleasableMilestone.id}-pending`,
          releaseId: resumeReleaseId!,
          milestoneId: nextReleasableMilestone.id,
          status: "pending",
        },
      };

      if ((response && !response.ok) || data.error) {
        setReleaseError(data.error ?? "Release request failed.");
        setReleaseStatus("failed");
        return;
      }

      if (ARC_CONFIG.executionMode === "real" && data.release?.id) {
        const claimResponse = await fetch(`/api/v1/releases/${data.release.id}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...productContextHeaders },
          body: JSON.stringify({}),
        });
        if (!claimResponse.ok) {
          throw new Error("Release execution was already claimed or is no longer executable.");
        }
        let walletResult: Awaited<ReturnType<typeof sendUsdcWithBrowserWallet>> | undefined;
        try {
          walletResult = await sendUsdcWithBrowserWallet({
            recipient: recipientAddress ?? "",
            amount: String(nextReleasableMilestone.amount),
            expectedSender: authType === "web3_wallet" ? address ?? undefined : undefined,
          });
        } catch (error) {
          if (error instanceof BrowserWalletPreBroadcastError) {
            const failedResponse = await fetch(`/api/v1/releases/${data.release.id}/proof/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...productContextHeaders },
              body: JSON.stringify({
                status: "failed",
                failureReason: `BROWSER_WALLET_PRE_BROADCAST: ${error.message}`,
              }),
            });
            const failedData = (await failedResponse.json()) as {
              error?: string;
              release?: { status?: string };
              proof?: { id: string; releaseId?: string; milestoneId?: string; status: "failed"; failureReason?: string; failedAt?: string };
            };
            if (!failedResponse.ok || failedData.error || !failedData.proof) {
              throw new Error(failedData.error ?? "Unable to safely record the cancelled wallet request.");
            }
            data.release.status = failedData.release?.status ?? "failed";
            data.proof = {
              id: failedData.proof.id,
              releaseId: failedData.proof.releaseId,
              milestoneId: failedData.proof.milestoneId ?? nextReleasableMilestone.id,
              txHash: "",
              network: "Arc Testnet",
              status: "failed",
              explorerUrl: "",
            };
          } else if (error instanceof BrowserWalletSubmissionUnknownError) {
            setActiveProof({
              id: data.proof?.id ?? `proof-${nextReleasableMilestone.id}-pending`,
              releaseId: data.release.id,
              milestoneId: nextReleasableMilestone.id,
              txHash: "",
              network: "Arc Testnet",
              status: "pending",
              explorerUrl: "",
              executionMode: "browser_wallet",
              releaseStatus: "pending",
              failureReason: "Wallet submission outcome is unknown. Reconcile with the wallet transaction hash before retrying.",
            });
            setReleaseError("Wallet submission outcome is unknown. Check wallet activity and confirm with the transaction hash; retry is locked to prevent duplicate payment.");
            setReleaseStatus("submitting");
            return;
          }
          throw error;
        }

        if (data.proof?.status !== "failed" && (!walletResult || walletResult.state !== "success" || !walletResult.txHash)) {
          throw new Error("Arc browser-wallet send did not return a successful transaction.");
        }

        if (data.proof?.status === "failed") {
          // The trusted pre-broadcast path above already recorded failure.
        } else {

        const proofResponse = await fetch(`/api/v1/releases/${data.release.id}/proof/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...productContextHeaders,
          },
          body: JSON.stringify({
            status: "confirmed",
            txHash: walletResult!.txHash,
            network: "Arc Testnet",
          }),
        });

        const proofData = (await proofResponse.json()) as {
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
          };
        };

        if (!proofResponse.ok || proofData.error || !proofData.proof) {
          throw new Error(proofData.error ?? "Unable to persist Arc settlement proof.");
        }

        data.release.status = "confirmed";
        data.proof = {
          id: proofData.proof.id,
          releaseId: proofData.proof.releaseId,
          milestoneId: proofData.proof.milestoneId ?? nextReleasableMilestone.id,
          txHash: proofData.proof.txHash ?? walletResult!.txHash,
          network: proofData.proof.network ?? "Arc Testnet",
          status: proofData.proof.status,
          explorerUrl: proofData.proof.explorerUrl ?? walletResult!.explorerUrl,
          confirmedAt: proofData.proof.confirmedAt ?? new Date().toISOString(),
        };
        }
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
      if (result.executionMode === undefined && data.release?.id && data.proof?.status) {
        result.executionMode = "browser_wallet";
        result.releaseStatus = data.release.status as TransactionProof["releaseStatus"];
      }
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
      setReleaseError(releaseErrorMessage(err, "Release request failed."));
      setReleaseStatus("failed");
    }
  }

  async function handleContinueCircleRelease() {
    if (!isOwnerActor || !resolvedProof?.releaseId || !isPendingCircleRelease) return;

    setReleaseError(null);
    setReleaseStatus("submitting");
    try {
      // Inspect Circle first. A completed challenge must be reconciled, never
      // reopened in the SDK; reopening it is what caused provider errors.
      let completedPayload = await completeCircleRelease(resolvedProof.releaseId);
      if (completedPayload.status === "pending" && completedPayload.phase === "confirmation") {
        completedPayload = await executeCircleRelease(resolvedProof.releaseId);
      }
      const proof = proofFromCirclePayload(completedPayload, resolvedProof);
      if (!proof) throw new Error("Circle wallet release did not return a settlement proof.");
      setActiveProof(proof);
      if (proof.status === "confirmed") {
        onReleaseSuccess?.({
          milestoneId: proof.milestoneId,
          proof,
          releasedAt: proof.confirmedAt ?? new Date().toISOString(),
        });
      }
      if (proof.status === "failed") {
        setReleaseError(proof.failureReason ?? "Circle wallet transfer failed before a transaction was submitted.");
      }
      void onActivityChange?.();
      setReleaseStatus(proof.status === "confirmed" ? "confirmed" : proof.status === "failed" ? "failed" : "submitting");
    } catch (err) {
      setReleaseError(releaseErrorMessage(err, "Unable to continue Circle wallet confirmation."));
    }
  }

  async function handleRefreshCircleSettlement() {
    if (!isOwnerActor || !resolvedProof?.releaseId || !isCircleSettlementPending) return;

    setReleaseError(null);
    setReleaseStatus("submitting");
    try {
      const completedPayload = await completeCircleRelease(resolvedProof.releaseId);
      const proof = proofFromCirclePayload(completedPayload, resolvedProof);
      if (!proof) throw new Error("Circle settlement did not return a proof.");
      setActiveProof(proof);
      if (proof.status === "confirmed") {
        onReleaseSuccess?.({
          milestoneId: proof.milestoneId,
          proof,
          releasedAt: proof.confirmedAt ?? new Date().toISOString(),
        });
      }
      if (proof.status === "failed") {
        setReleaseError(proof.failureReason ?? "Circle wallet transfer failed.");
      }
      void onActivityChange?.();
      setReleaseStatus(proof.status === "confirmed" ? "confirmed" : proof.status === "failed" ? "failed" : "submitting");
    } catch (err) {
      setReleaseError(releaseErrorMessage(err, "Unable to refresh Circle settlement."));
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
        headers: {
          "Content-Type": "application/json",
          ...productContextHeaders,
        },
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
        headers: {
          "Content-Type": "application/json",
          ...productContextHeaders,
        },
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
          <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)]/74 p-4">
            <p className="font-semibold text-[var(--foreground)]">
              {nextReleasableMilestone
                ? nextReleasableMilestone.title
                : resolvedProof
                  ? "Latest released milestone"
                  : "No release available yet"}
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
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
            <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Payment source</p>
              {authType === "web2_google" ? (
                <>
                  <p className="mt-2 font-medium text-[var(--foreground)]">Circle Smart Wallet · Coming soon</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Connect an enabled Web3 wallet to sign releases in the current MVP.</p>
                </>
              ) : authType === "web3_wallet" && address ? (
                <>
                  <p className="mt-2 font-medium text-[var(--foreground)]">Linked Web3 EOA · {shortenAddress(address)}</p>
                  <p className="mt-1 break-all font-mono text-xs text-[var(--text-primary)]">{address}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Confirmation: sign and submit in the connected browser wallet.</p>
                </>
              ) : (
                <p className="mt-2 text-xs text-[var(--text-muted)]">Sign in as the workspace owner to determine the payment source.</p>
              )}
            </div>
          </div>
          <ReleasePanel
            amount={nextReleasableMilestone?.amount ?? 0}
            network="Arc Testnet"
            modeLabel="Web3 browser wallet"
            enabled={isOwnerActor && (Boolean(nextReleasableMilestone) || Boolean(resolvedProof))}
            actionEnabled={releaseActionEnabled}
            allowWhileSubmitting={isPendingCircleRelease || isBrowserReleasable}
            actionLabel={releaseActionLabel}
            status={effectiveReleaseStatus}
            errorMessage={releaseError}
            onRelease={() => {
              void (isCircleSettlementPending
                ? handleRefreshCircleSettlement()
                : needsCircleConfirmation
                  ? handleContinueCircleRelease()
                  : isBrowserReleasable
                    ? handleRelease(resolvedProof?.releaseId)
                  : handleRelease());
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
            <div className="mt-4 space-y-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Refresh pending settlement</p>
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
            ? "Real USDC moves on Arc. Browser-wallet releases are signed in your wallet; Circle Wallets releases are executed server-side. The settlement proof is attached to the payout after the transfer settles."
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
              className="flex gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-xs font-semibold text-[var(--foreground)]">
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
