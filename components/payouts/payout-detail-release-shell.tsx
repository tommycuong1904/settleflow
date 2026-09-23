"use client";

import { useMemo, useState } from "react";

import { ARC_CONFIG } from "@/lib/arc/config";
import {
  assertBrowserWalletMatchesAuthenticatedAccount,
  BrowserWalletPreBroadcastError,
  BrowserWalletSubmissionUnknownError,
  sendUsdcWithBrowserWallet,
} from "@/lib/arc/browser-wallet";
import { executeCircleChallenge, type CircleSdkChallenge } from "@/lib/circle/user-controlled-client";
import { mapSendResultToProof } from "@/lib/arc/map-send-result-to-proof";
import type { ReleasePanelStatus } from "@/components/payouts/release-panel";
import { TransactionProofCard } from "@/components/payouts/transaction-proof-card";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Milestone } from "@/lib/models/milestone";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { PRODUCT_CONTEXT_HEADER_NAMES, type ProductActor } from "@/lib/runtime/product-context";
import { hasRole, isRole } from "@/lib/runtime/role-utils";
import { useWallet } from "@/lib/context/wallet-context";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { X } from "lucide-react";

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
  const [activeProof, setActiveProof] = useState<TransactionProof | undefined>(releaseProof);
  const [releaseModalMode, setReleaseModalMode] = useState<"review" | "pending" | "failed" | null>(null);
  const [resumeReleaseId, setResumeReleaseId] = useState<string | undefined>();
  useScrollLock(releaseModalMode !== null);

  const resolvedProof = activeProof ?? releaseProof;
  const proofMatchesCurrentMilestone =
    resolvedProof && nextReleasableMilestone
      ? resolvedProof.milestoneId === nextReleasableMilestone.id
      : Boolean(resolvedProof);
  const proofForNextAction = proofMatchesCurrentMilestone ? resolvedProof : undefined;
  const effectiveReleaseStatus =
    proofForNextAction
      ? proofForNextAction.status === "failed"
        ? "failed"
        : proofForNextAction.status === "pending"
          ? "submitting"
          : "confirmed"
      : nextReleasableMilestone
        ? "idle"
        : releaseStatus;
  const isPendingCircleRelease = Boolean(
    proofForNextAction?.status === "pending" &&
    proofForNextAction.releaseId &&
    proofForNextAction.executionMode === "circle_user_wallet",
  );
  const isCircleSettlementPending = Boolean(
    isPendingCircleRelease && (proofForNextAction?.releaseTxHash || proofForNextAction?.releaseArcRequestId),
  );
  const needsCircleConfirmation = isPendingCircleRelease && !isCircleSettlementPending;
  const isBrowserReleasable = Boolean(
    proofForNextAction?.status === "pending" &&
    proofForNextAction.releaseId &&
    proofForNextAction.executionMode === "browser_wallet" &&
    proofForNextAction.releaseStatus === "queued",
  );
  const isBrowserReconciliationPending = Boolean(
    proofForNextAction?.status === "pending" &&
    proofForNextAction.executionMode === "browser_wallet" &&
    proofForNextAction.releaseStatus === "pending",
  );
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
    if (authType !== "web3_wallet") {
      setReleaseError("Connect an enabled Web3 wallet to release from a browser wallet.");
      return;
    }
    if (ARC_CONFIG.executionMode === "real") {
      try {
        if (!address) throw new Error("The authenticated Web3 wallet address is unavailable. Sign in again before releasing.");
        await assertBrowserWalletMatchesAuthenticatedAccount(address);
      } catch (error) {
        setReleaseError(releaseErrorMessage(error, "Unable to verify the browser wallet account."));
        return;
      }
    }
    setReleaseStatus("submitting");

    try {
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
              releaseId: data.release!.id,
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
          setActiveProof({
            id: data.proof?.id ?? `proof-${nextReleasableMilestone.id}-pending`,
            releaseId: data.release.id,
            milestoneId: nextReleasableMilestone.id,
            txHash: walletResult!.txHash!,
            network: "Arc Testnet",
            status: "pending",
            explorerUrl: walletResult!.explorerUrl ?? "",
            executionMode: "browser_wallet",
            releaseStatus: "pending",
            failureReason: "Payment needs review. The submitted transaction could not be verified against this release.",
          });
          setReleaseError(
            proofData.error
              ? `Payment needs review: ${proofData.error}`
              : `Payment needs review: settlement verification returned HTTP ${proofResponse.status}.`,
          );
          setReleaseStatus("submitting");
          focusPendingSettlementResolution();
          return;
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

  function focusPendingSettlementResolution() {
    setConfirmationTxHash(resolvedProof?.txHash ?? "");
    setReleaseModalMode("pending");
  }

  function openReleaseReview(releaseId?: string) {
    setResumeReleaseId(releaseId);
    setReleaseError(null);
    setReleaseModalMode("review");
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

  async function handleRetryRelease(): Promise<string | null> {
    if (!isOwnerActor || !resolvedProof?.releaseId || retryingRelease) {
      return null;
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
              executionMode: "browser_wallet",
              releaseStatus: "queued",
              confirmedAt: undefined,
            }
          : current,
      );
      setConfirmationTxHash("");
      setReleaseStatus("submitting");
      void onActivityChange?.();
      return data.release?.id ?? null;
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : "Retry release request failed.");
      setReleaseStatus("failed");
      return null;
    } finally {
      setRetryingRelease(false);
    }
  }

  async function handleRefreshProof(status: "confirmed" | "failed", failureReasonOverride?: string) {
    if (!isOwnerActor || !resolvedProof?.releaseId || refreshingProof) {
      return false;
    }

    const txHash = confirmationTxHash.trim();
    const reason = failureReasonOverride ?? "";

    if (status === "confirmed" && txHash.length === 0) {
      setReleaseError("Tx hash is required to confirm settlement proof.");
      return false;
    }

    if (status === "failed" && reason.length === 0) {
      setReleaseError("Failure reason is required to mark settlement proof as failed.");
      return false;
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

      let data: {
        error?: string;
        code?: string;
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
      try {
        data = (await response.json()) as typeof data;
      } catch {
        throw new Error(`Settlement verification returned HTTP ${response.status}.`);
      }

      if (!response.ok || data.error || !data.proof) {
        throw new Error(data.error ?? data.code ?? `Settlement verification returned HTTP ${response.status}.`);
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
        void onActivityChange?.();
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Settlement verification did not complete.";
      setReleaseError(`${message} The payment remains pending; do not retry or sign again.`);
      setReleaseStatus("submitting");
      return false;
    } finally {
      setRefreshingProof(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="sf-shell">
        <CardHeader>
          <CardTitle>Next action</CardTitle>
          <CardDescription>SettleFlow will guide this payment one safe step at a time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)]/74 p-5 text-sm text-[var(--text-primary)]">
            {effectiveReleaseStatus === "confirmed" ? (
              <><p className="text-lg font-semibold text-[var(--foreground)]">Payment complete</p><p className="mt-2 text-[var(--text-muted)]">This payment has been verified on Arc. No further action is needed.</p></>
            ) : !isOwnerActor ? (
              <><p className="text-lg font-semibold text-[var(--foreground)]">Waiting for the owner</p><p className="mt-2 text-[var(--text-muted)]">Only the workspace owner can approve or release this payment.</p></>
            ) : isCircleSettlementPending ? (
              <><p className="text-lg font-semibold text-[var(--foreground)]">Payment sent — checking status</p><p className="mt-2 text-[var(--text-muted)]">SettleFlow is checking the existing payment. Do not create another one.</p><Button className="mt-5" onClick={() => { void handleRefreshCircleSettlement(); }}>Check payment</Button></>
            ) : needsCircleConfirmation ? (
              <><p className="text-lg font-semibold text-[var(--foreground)]">Finish payment confirmation</p><p className="mt-2 text-[var(--text-muted)]">Continue the existing confirmation. SettleFlow will not create another payment.</p><Button className="mt-5" onClick={() => { void handleContinueCircleRelease(); }}>Continue confirmation</Button></>
            ) : isBrowserReconciliationPending ? (
              <><p className="text-lg font-semibold text-[var(--foreground)]">Payment sent — verify it</p><p className="mt-2 text-[var(--text-muted)]">Do not sign again. Verify the transaction already sent from your wallet.</p><Button className="mt-5" onClick={focusPendingSettlementResolution}>Verify payment</Button></>
            ) : effectiveReleaseStatus === "failed" ? (
              <><p className="text-lg font-semibold text-[var(--foreground)]">Payment was not completed</p><p className="mt-2 text-[var(--text-muted)]">Check the prior attempt before starting a new payment.</p><Button className="mt-5" onClick={() => setReleaseModalMode("failed")}>Review payment issue</Button></>
            ) : isBrowserReleasable ? (
              <><p className="text-lg font-semibold text-[var(--foreground)]">Ready to continue payment</p><p className="mt-2 text-[var(--text-muted)]">SettleFlow will use the existing release. It will not create another one.</p><Button className="mt-5" onClick={() => openReleaseReview(resolvedProof?.releaseId)}>Review & sign</Button></>
            ) : nextReleasableMilestone ? (
              <><p className="text-lg font-semibold text-[var(--foreground)]">Ready to pay {formatUsdc(nextReleasableMilestone.amount)} USDC</p><p className="mt-2 text-[var(--text-muted)]">Review the recipient, then sign once in your browser wallet.</p><Button className="mt-5" onClick={() => openReleaseReview()}>Review & pay</Button></>
            ) : (
              <><p className="text-lg font-semibold text-[var(--foreground)]">No payment action needed</p><p className="mt-2 text-[var(--text-muted)]">Approve a submitted milestone to unlock the next payment.</p></>
            )}
            {releaseError ? <p className="mt-4 text-sm text-rose-600">{releaseError}</p> : null}
            <details className="mt-5 border-t border-[var(--border-soft)] pt-4"><summary className="cursor-pointer font-medium text-[var(--foreground)]">Payment details</summary><div className="mt-3 space-y-2 text-xs text-[var(--text-muted)]"><p>Recipient: <span className="break-all font-mono text-[var(--text-primary)]">{recipientAddress ?? "Not resolved"}</span></p><p>Wallet: <span className="font-mono text-[var(--text-primary)]">{address ? shortenAddress(address) : "Sign in with Web3"}</span></p><p>Network: Arc Testnet</p></div></details>
          </div>
        </CardContent>
      </Card>

      <Card className="sf-shell">
        <CardHeader>
          <CardTitle>Payment record</CardTitle>
          <CardDescription>Transaction and settlement details are available when you need them.</CardDescription>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">View transaction details</summary>
            <div className="mt-4"><TransactionProofCard proof={resolvedProof} milestoneTitle={releaseMilestoneTitle} /></div>
          </details>
        </CardContent>
      </Card>
      {releaseModalMode && nextReleasableMilestone ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={() => setReleaseModalMode(null)}>
          <div className="relative w-full max-w-lg rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setReleaseModalMode(null)} className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]" aria-label="Close release dialog"><X size={18} /></button>
            {releaseModalMode === "review" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{resumeReleaseId ? "Continue existing release" : "Review payment"}</p>
                <h2 className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">{resumeReleaseId ? "Ready for wallet signature" : "Confirm before signing"}</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{resumeReleaseId ? "This continues the existing release attempt. SettleFlow will not create another release." : "SettleFlow will verify your active wallet before creating a release. You will then sign the USDC transfer in your browser wallet."}</p>
                <dl className="mt-5 space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm">
                  <div><dt className="text-xs text-[var(--text-muted)]">Milestone</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{nextReleasableMilestone.title}</dd></div>
                  <div><dt className="text-xs text-[var(--text-muted)]">Amount</dt><dd className="mt-1 text-lg font-semibold text-[var(--foreground)]">{formatUsdc(nextReleasableMilestone.amount)} USDC</dd></div>
                  <div><dt className="text-xs text-[var(--text-muted)]">Recipient</dt><dd className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">{recipientAddress ?? "Not resolved"}</dd></div>
                  <div><dt className="text-xs text-[var(--text-muted)]">Authenticated Web3 wallet</dt><dd className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">{address ?? "Sign in with Web3 first"}</dd></div>
                </dl>
                <p className="mt-4 text-xs text-[var(--text-muted)]">If MetaMask has a different active account, SettleFlow will stop before creating a release and show you which account to switch.</p>
                <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setReleaseModalMode(null)}>Cancel</Button><Button onClick={() => { const releaseId = resumeReleaseId; setReleaseModalMode(null); setResumeReleaseId(undefined); void handleRelease(releaseId); }}>{resumeReleaseId ? "Verify wallet & continue" : "Verify wallet & sign"}</Button></div>
              </>
            ) : releaseModalMode === "pending" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Verify payment</p>
                <h2 className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">Did MetaMask send this payment?</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">Do not sign again. Verify the transaction already sent from your wallet, or confirm that MetaMask never submitted one.</p>
                {resolvedProof?.txHash ? <a href={`${ARC_CONFIG.explorerUrl}/tx/${resolvedProof.txHash}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex text-sm font-medium text-[var(--foreground)] underline underline-offset-4">View submitted transaction</a> : null}
                <div className="mt-5 space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
                  <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="payment-transaction-hash">Transaction hash</label>
                  <Input id="payment-transaction-hash" value={confirmationTxHash} onChange={(event) => setConfirmationTxHash(event.target.value)} placeholder="Paste the 0x… hash from MetaMask" />
                  <Button onClick={() => { void handleRefreshProof("confirmed").then((resolved) => { if (resolved) setReleaseModalMode(null); }); }} disabled={refreshingProof}>{refreshingProof ? "Verifying payment..." : "Verify payment"}</Button>
                </div>
                <Button className="mt-4" variant="secondary" onClick={() => { void handleRefreshProof("failed", "OWNER_CONFIRMED_NO_TRANSACTION: Owner confirmed that MetaMask did not submit a transaction.").then((resolved) => { if (resolved) setReleaseModalMode(null); }); }} disabled={refreshingProof}>MetaMask did not send a payment</Button>
                {releaseError ? <p className="mt-3 text-sm text-rose-600">{releaseError}</p> : null}
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Release did not complete</p>
                <h2 className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">Start a new release attempt?</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">The prior release was recorded as failed. Retrying creates a new attempt; it does not resend the failed one.</p>
                {resolvedProof?.failureReason ? <p className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-muted)]">{resolvedProof.failureReason}</p> : null}
                <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setReleaseModalMode(null)}>Cancel</Button><Button onClick={() => { void handleRetryRelease().then((releaseId) => { if (releaseId) openReleaseReview(releaseId); }); }} disabled={retryingRelease}>{retryingRelease ? "Creating retry..." : "Create retry"}</Button></div>
                {releaseError ? <p className="mt-3 text-sm text-rose-600">{releaseError}</p> : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
