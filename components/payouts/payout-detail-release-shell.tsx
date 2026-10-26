"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ARC_CONFIG } from "@/lib/arc/config";
import {
  assertBrowserWalletMatchesAuthenticatedAccount,
  BrowserWalletPreBroadcastError,
  BrowserWalletSubmissionUnknownError,
  sendUsdcWithBrowserWallet,
} from "@/lib/arc/browser-wallet";
import { executeCircleChallenge, getCirclePaymentSession, type CircleSdkChallenge } from "@/lib/circle/user-controlled-client";
import { mapSendResultToProof } from "@/lib/arc/map-send-result-to-proof";
import type { ReleasePanelStatus } from "@/components/payouts/release-panel";
import { TransactionProofCard } from "@/components/payouts/transaction-proof-card";
import { Button } from "@/components/shared/button";
import type { Milestone } from "@/lib/models/milestone";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import type { PaymentAttempt } from "@/lib/models/payment-attempt";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { PRODUCT_CONTEXT_HEADER_NAMES, type ProductActor } from "@/lib/runtime/product-context";
import { hasRole, isRole } from "@/lib/runtime/role-utils";
import { useWallet } from "@/lib/context/wallet-context";
import { formatUsdc } from "@/lib/utils/format";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import { X } from "lucide-react";

type PayoutDetailReleaseShellProps = {
  payoutId: string;
  recipientName?: string;
  recipientAddress?: string;
  nextReleasableMilestone?: Milestone;
  releaseMilestoneTitle?: string;
  releaseProof?: TransactionProof;
  currentActor: ProductActor;
  reviewRequest?: number;
  onReleaseSuccess?: (payload: {
    milestoneId: string;
    proof: TransactionProof;
    releasedAt: string;
  }) => void;
  onSimulatedPaymentSuccess?: (payload: {
    milestoneId: string;
    completedAt: string;
    payoutStatus?: "active" | "partially_released" | "completed";
    payment: PaymentAttempt;
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

function paymentActionErrorMessage(message: string | null) {
  if (!message || message.toLowerCase().includes("release already exists")) return null;
  if (isRealExecutionAuthorizationError(message)) return null;
  if (message.toLowerCase().includes("network connection failed")) {
    return "No payment was sent. Check that your wallet is connected to Arc Testnet, then try again.";
  }
  return "We couldn’t complete this payment attempt. Review the next steps before trying again.";
}

function isRealExecutionAuthorizationError(message: string | null) {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("live arc testnet payments are not authorized");
}

export function PayoutDetailReleaseShell({
  recipientName,
  recipientAddress,
  nextReleasableMilestone,
  releaseMilestoneTitle,
  releaseProof,
  currentActor,
  reviewRequest = 0,
  onReleaseSuccess,
  onSimulatedPaymentSuccess,
  onActivityChange,
}: PayoutDetailReleaseShellProps) {
  const router = useRouter();
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
  const [activeProof, setActiveProof] = useState<TransactionProof | undefined>(releaseProof);
  const [releaseModalMode, setReleaseModalMode] = useState<"method" | "review" | "simulated" | "pending" | "failed" | "setup" | null>(null);
  const [resumeReleaseId, setResumeReleaseId] = useState<string | undefined>();
  const [recordingSimulatedPayment, setRecordingSimulatedPayment] = useState(false);
  const [processingRelease, setProcessingRelease] = useState(false);
  const handledReviewRequest = useRef(0);
  const releaseDialogRef = useRef<HTMLDivElement>(null);
  useScrollLock(releaseModalMode !== null);
  useFocusTrap(releaseModalMode !== null, releaseDialogRef);

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
  const canRecoverLegacyBrowserRelease = Boolean(
    authType === "web2_google" &&
    proofForNextAction?.executionMode === "browser_wallet" &&
    proofForNextAction?.status === "pending" &&
    resolvedProof?.releaseId,
  );
  const canStartCircleReplacement = Boolean(
    authType === "web2_google" && effectiveReleaseStatus === "failed" &&
    proofForNextAction?.executionMode === "browser_wallet" &&
    proofForNextAction.failureReason?.startsWith("BROWSER_WALLET_RECONCILIATION:"),
  );
  const shouldShowPaymentAction = isOwnerActor && (
    effectiveReleaseStatus === "submitting" ||
    effectiveReleaseStatus === "failed"
  );
  const shouldShowPaymentRecord = Boolean(
    resolvedProof && (resolvedProof.status === "confirmed" || resolvedProof.txHash),
  );
  const actionableReleaseError = paymentActionErrorMessage(releaseError);
  const requiresPaymentReconnect = releaseError?.includes("Reconnect your payment account") ?? false;
  const hasExistingRelease = releaseError?.includes("A release already exists") ?? false;
  const paymentSupportMessage = releaseError ?? "This payment needs a little more time or review. You do not need to retry it or provide payment details.";
  const isModalActionPending = processingRelease || recordingSimulatedPayment;
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

  const canUseSimulatedPayment = ARC_CONFIG.executionMode === "demo" || ARC_CONFIG.executionMode === "mock";
  const openPaymentMethod = useCallback(async () => {
    setReleaseError(null);
    setResumeReleaseId(undefined);
    // In real/Testnet there is one enabled rail, so asking the user to choose
    // it only adds a redundant modal step. Demo/mock retains the selector.
    if (authType === "web2_google" && !canUseSimulatedPayment) {
      try {
        const response = await fetch("/api/v1/circle/wallet", { cache: "no-store" });
        const payload = response.ok ? await response.json() as { wallet?: { address?: string } | null } : null;
        if (!payload?.wallet?.address) {
          setReleaseModalMode("setup");
          return;
        }
        if (!getCirclePaymentSession()) {
          setReleaseError("Reconnect your payment account in Settings before paying.");
          setReleaseModalMode("failed");
          return;
        }
      } catch {
        // The release route remains the readiness authority if this advisory
        // check is temporarily unavailable.
      }
    }
    setReleaseModalMode(canUseSimulatedPayment ? "method" : "review");
  }, [authType, canUseSimulatedPayment]);

  useEffect(() => {
    if (
      !reviewRequest ||
      reviewRequest === handledReviewRequest.current ||
      !isOwnerActor ||
      !nextReleasableMilestone
    ) return;
    handledReviewRequest.current = reviewRequest;
    void openPaymentMethod();
  }, [isOwnerActor, nextReleasableMilestone, openPaymentMethod, reviewRequest]);

  useEffect(() => {
    if (!releaseModalMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isModalActionPending) {
        event.preventDefault();
        setReleaseModalMode(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalActionPending, releaseModalMode]);

  useEffect(() => {
    if (!releaseModalMode) return;

    const focusFrame = window.requestAnimationFrame(() => {
      if (!releaseDialogRef.current?.contains(document.activeElement)) {
        releaseDialogRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
      }
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [releaseModalMode]);

  function closeReleaseModal() {
    if (!isModalActionPending) setReleaseModalMode(null);
  }

  async function completeCircleRelease(releaseId: string) {
    const circleSession = getCirclePaymentSession();
    if (!circleSession) throw new Error("Reconnect your payment account before checking this payment.");
    const completed = await fetch(`/api/v1/releases/${releaseId}/circle/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...productContextHeaders },
      body: JSON.stringify({ userToken: circleSession.userToken }),
    });
    const completedPayload = (await completed.json()) as CircleReleasePayload;
    if (!completed.ok && completed.status !== 202) throw new Error(completedPayload.error ?? "Circle wallet release failed.");
    return completedPayload;
  }

  async function executeCircleRelease(releaseId: string) {
    const circleSession = getCirclePaymentSession();
    if (!circleSession) throw new Error("Reconnect your payment account before confirming this payment.");
    const challengeResponse = await fetch(`/api/v1/releases/${releaseId}/circle/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...productContextHeaders },
      body: JSON.stringify({ userToken: circleSession.userToken }),
    });
    const challengePayload = (await challengeResponse.json()) as { error?: string; challenge?: CircleSdkChallenge };
    if (!challengeResponse.ok || challengePayload.error || !challengePayload.challenge) {
      throw new Error(challengePayload.error ?? "Unable to prepare Circle wallet confirmation.");
    }
    try {
      await executeCircleChallenge(challengePayload.challenge, circleSession);
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
    if (authType !== "web3_wallet" && authType !== "web2_google") {
      setReleaseError("Sign in with Google or an enabled Web3 wallet before using Wallet payment.");
      setReleaseModalMode("failed");
      return;
    }
    const usesCirclePaymentAccount = authType === "web2_google";
    const releaseSourceAddress = address ?? undefined;
    if (ARC_CONFIG.executionMode === "real") {
      try {
        await assertPaymentEnvironmentReady();
        if (authType === "web3_wallet") {
          if (!address) throw new Error("The authenticated Web3 wallet address is unavailable. Sign in again before releasing.");
          await assertBrowserWalletMatchesAuthenticatedAccount(address);
        } else if (!getCirclePaymentSession()) {
          throw new Error("Reconnect your payment account in Settings before paying.");
        }
      } catch (error) {
        setReleaseError(releaseErrorMessage(error, "Unable to verify the browser wallet account."));
        setReleaseModalMode("failed");
        return;
      }
    }
    setProcessingRelease(true);
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
          executionMode: usesCirclePaymentAccount ? "circle_user_wallet" : "browser_wallet",
          sourceWalletAddress: releaseSourceAddress,
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
          failureReason?: string;
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
        if (data.error?.includes("A release already exists")) {
          const existingResponse = await fetch(`/api/v1/milestones/${nextReleasableMilestone.id}/release`, {
            headers: productContextHeaders,
          });
          const existingData = (await existingResponse.json().catch(() => null)) as {
            existingRelease?: { proof?: TransactionProof };
          } | null;
          if (existingResponse.ok && existingData?.existingRelease?.proof) {
            setActiveProof(existingData.existingRelease.proof);
            setReleaseStatus(existingData.existingRelease.proof.status === "failed" ? "failed" : existingData.existingRelease.proof.status === "confirmed" ? "confirmed" : "submitting");
            setReleaseModalMode(null);
            return;
          }
        }
        setReleaseError(data.error ?? "Release request failed.");
        setReleaseStatus("failed");
        setReleaseModalMode("failed");
        return;
      }

      if (ARC_CONFIG.executionMode === "real" && usesCirclePaymentAccount && data.release?.id) {
        const fallback: TransactionProof = {
          id: data.proof?.id ?? `proof-${nextReleasableMilestone.id}-pending`,
          releaseId: data.proof?.releaseId ?? data.release.id,
          milestoneId: data.proof?.milestoneId ?? nextReleasableMilestone.id,
          txHash: data.proof?.txHash ?? "",
          network: data.proof?.network ?? "Arc Testnet",
          status: "pending",
          explorerUrl: data.proof?.explorerUrl ?? "",
          executionMode: "circle_user_wallet",
          releaseStatus: "pending",
        };
        const circlePayload = await executeCircleRelease(data.release.id);
        const proof = proofFromCirclePayload(circlePayload, fallback);
        if (!proof) throw new Error("Payment confirmation did not return a payment status.");
        setActiveProof(proof);
        if (proof.status === "confirmed") {
          onReleaseSuccess?.({
            milestoneId: proof.milestoneId,
            proof,
            releasedAt: proof.confirmedAt ?? new Date().toISOString(),
          });
        }
        if (proof.status === "failed") setReleaseError(proof.failureReason ?? "This payment could not be completed.");
        void onActivityChange?.();
        setReleaseStatus(proof.status === "confirmed" ? "confirmed" : proof.status === "failed" ? "failed" : "submitting");
        setReleaseModalMode(proof.status === "confirmed" ? null : proof.status === "failed" ? "failed" : "pending");
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
            expectedSender: releaseSourceAddress,
          });
        } catch (error) {
          if (error instanceof BrowserWalletPreBroadcastError) {
            const failureReason = `BROWSER_WALLET_PRE_BROADCAST: ${error.message}`;
            const failedResponse = await fetch(`/api/v1/releases/${data.release.id}/proof/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...productContextHeaders },
              body: JSON.stringify({
                status: "failed",
                failureReason,
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
              failureReason: failedData.proof.failureReason ?? failureReason,
            };
            setReleaseError(error.message);
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
            setReleaseModalMode("pending");
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
          setReleaseModalMode("pending");
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
        setReleaseModalMode("failed");
        return;
      }

      const resolvedResult: TransactionProof = {
        ...result,
        ...(result.status === "failed" ? { failureReason: data.proof?.failureReason } : {}),
        ...(result.executionMode === undefined && data.release?.id && data.proof?.status
          ? { executionMode: "browser_wallet" as const, releaseStatus: data.release.status as TransactionProof["releaseStatus"] }
          : {}),
      };
      setActiveProof(resolvedResult);
      if (resolvedResult.status === "confirmed") {
        onReleaseSuccess?.({
          milestoneId: nextReleasableMilestone.id,
          proof: resolvedResult,
          releasedAt: resolvedResult.confirmedAt ?? new Date().toISOString(),
        });
      }

      void onActivityChange?.();
      setReleaseStatus(resolvedResult.status === "failed" ? "failed" : resolvedResult.status === "pending" ? "submitting" : "confirmed");
      if (resolvedResult.status === "failed") {
        setReleaseModalMode("failed");
      } else if (resolvedResult.status === "confirmed") {
        setReleaseModalMode(null);
      }
    } catch (err) {
      setReleaseError(releaseErrorMessage(err, "Release request failed."));
      setReleaseStatus("failed");
      setReleaseModalMode("failed");
    } finally {
      setProcessingRelease(false);
    }
  }

  async function handleSimulatedPayment() {
    if (!isOwnerActor || !nextReleasableMilestone || recordingSimulatedPayment) return;
    setReleaseError(null);
    setRecordingSimulatedPayment(true);
    try {
      const response = await fetch(`/api/v1/milestones/${nextReleasableMilestone.id}/simulated-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...productContextHeaders },
        body: JSON.stringify({ amountUsdc: String(nextReleasableMilestone.amount) }),
      });
      const payload = (await response.json()) as {
        error?: string;
        payment?: {
          id: string;
          method: "simulated";
          status: "completed";
          evidenceType: "none";
          amountUsdc: string;
          currency: string;
          recipientLabel: string;
          completedAt?: string | null;
        };
        payout?: { status?: "active" | "partially_released" | "completed" };
      };
      if (!response.ok || payload.error || !payload.payment?.completedAt) {
        throw new Error(payload.error ?? "Unable to record the simulated payment.");
      }
      onSimulatedPaymentSuccess?.({
        milestoneId: nextReleasableMilestone.id,
        completedAt: payload.payment.completedAt,
        payoutStatus: payload.payout?.status,
        payment: {
          id: payload.payment.id,
          milestoneId: nextReleasableMilestone.id,
          method: payload.payment.method,
          status: payload.payment.status,
          evidenceType: payload.payment.evidenceType,
          amount: Number(payload.payment.amountUsdc),
          currency: payload.payment.currency,
          recipientLabel: payload.payment.recipientLabel,
          completedAt: payload.payment.completedAt,
        },
      });
      void onActivityChange?.();
      setReleaseModalMode(null);
    } catch (error) {
      setReleaseError(releaseErrorMessage(error, "Unable to record the simulated payment."));
    } finally {
      setRecordingSimulatedPayment(false);
    }
  }

  function openReleaseReview(releaseId?: string) {
    setResumeReleaseId(releaseId);
    setReleaseError(null);
    setReleaseModalMode("review");
  }

  async function assertPaymentEnvironmentReady() {
    const response = await fetch(`/api/v1/milestones/${nextReleasableMilestone?.id}/release`, {
      headers: productContextHeaders,
    });
    const data = (await response.json()) as { error?: string; ready?: boolean };
    if (!response.ok || data.error || !data.ready) {
      throw new Error(data.error ?? "Payments are not ready in this environment.");
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

  async function handleResolveLegacyBrowserRelease() {
    if (!resolvedProof?.releaseId) return;
    setProcessingRelease(true);
    setReleaseError(null);
    try {
      const response = await fetch(`/api/v1/releases/${resolvedProof.releaseId}/mark-unsubmitted`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...productContextHeaders },
      });
      const data = await response.json() as { error?: string; proof?: TransactionProof };
      if (!response.ok || data.error || !data.proof) throw new Error(data.error ?? "Unable to check the previous payment.");
      setActiveProof({ ...data.proof, executionMode: "browser_wallet", releaseStatus: "failed" });
      setReleaseStatus("failed");
      void onActivityChange?.();
    } catch (error) {
      setReleaseError(releaseErrorMessage(error, "Unable to check the previous payment."));
      setReleaseModalMode("failed");
    } finally {
      setProcessingRelease(false);
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

  return (
    <div className="flex flex-col gap-6">
      {shouldShowPaymentAction ? (
        <section aria-label="Payment action" className="border-t border-[var(--border-soft)] px-1 pt-5 text-sm text-[var(--text-primary)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {isCircleSettlementPending ? (
                <><p className="font-semibold text-[var(--foreground)]">Payment sent — checking status</p><p className="mt-1 text-[var(--text-muted)]">SettleFlow is checking the existing payment. Do not create another one.</p></>
              ) : needsCircleConfirmation ? (
                <><p className="font-semibold text-[var(--foreground)]">Finish payment confirmation</p><p className="mt-1 text-[var(--text-muted)]">Continue the existing confirmation. SettleFlow will not create another payment.</p></>
              ) : isBrowserReconciliationPending && !canRecoverLegacyBrowserRelease ? (
                <><p className="font-semibold text-[var(--foreground)]">Payment processing</p><p className="mt-1 text-[var(--text-muted)]">We’re confirming this payment. You do not need to take action right now.</p></>
              ) : effectiveReleaseStatus === "failed" ? (
                <><p className="font-semibold text-[var(--foreground)]">Payment needs support</p><p className="mt-1 text-[var(--text-muted)]">We’re reviewing this payment. You do not need to take action right now.</p></>
              ) : canRecoverLegacyBrowserRelease ? (
                <><p className="font-semibold text-[var(--foreground)]">Previous payment needs a quick check</p><p className="mt-1 text-[var(--text-muted)]">We’ll check the earlier browser-wallet request before using your payment account.</p></>
              ) : isBrowserReleasable ? (
                <><p className="font-semibold text-[var(--foreground)]">Continue payment</p><p className="mt-1 text-[var(--text-muted)]">Continue the existing payment. SettleFlow will not create another one.</p></>
              ) : nextReleasableMilestone ? (
                <><p className="font-semibold text-[var(--foreground)]">Ready to pay {formatUsdc(nextReleasableMilestone.amount)} USDC</p><p className="mt-1 text-[var(--text-muted)]">Choose how you want to record this payment.</p></>
              ) : null}
            </div>
            {isCircleSettlementPending ? <Button onClick={() => { void handleRefreshCircleSettlement(); }}>Check payment</Button>
              : needsCircleConfirmation ? <Button onClick={() => { void handleContinueCircleRelease(); }}>Continue confirmation</Button>
                : canRecoverLegacyBrowserRelease ? <Button onClick={() => { void handleResolveLegacyBrowserRelease(); }}>{processingRelease ? "Checking payment..." : "Check previous payment"}</Button>
                : isBrowserReconciliationPending ? <Button onClick={() => setReleaseModalMode("pending")}>View status</Button>
                  : canStartCircleReplacement ? <Button onClick={() => { void openPaymentMethod(); }}>Pay with payment account</Button>
                  : effectiveReleaseStatus === "failed" ? <Button onClick={() => setReleaseModalMode("failed")}>View status</Button>
                    : isBrowserReleasable ? <Button onClick={() => openReleaseReview(resolvedProof?.releaseId)}>Continue payment</Button>
                      : nextReleasableMilestone ? <Button onClick={() => { void openPaymentMethod(); }}>Pay {formatUsdc(nextReleasableMilestone.amount)} USDC</Button>
                        : null}
          </div>
          {actionableReleaseError ? <p className="mt-3 text-sm text-rose-600">{actionableReleaseError}</p> : null}
        </section>
      ) : null}

      {shouldShowPaymentRecord ? (
        <section className="border-t border-[var(--border-soft)] px-1 pt-5">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
              Payment details
              <span className="ml-2 font-normal text-[var(--text-muted)]">View payment status and transaction details</span>
            </summary>
            <div className="mt-4"><TransactionProofCard proof={resolvedProof} milestoneTitle={releaseMilestoneTitle} /></div>
          </details>
        </section>
      ) : null}
      {releaseModalMode && nextReleasableMilestone ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-4" onClick={closeReleaseModal}>
          <div ref={releaseDialogRef} role="dialog" aria-modal="true" aria-labelledby="release-dialog-title" tabIndex={-1} className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={closeReleaseModal} disabled={isModalActionPending} className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Close release dialog"><X size={18} /></button>
            {releaseModalMode === "setup" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Payment account</p>
                <h2 id="release-dialog-title" className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">Set up your payment account first</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">SettleFlow needs your secure payment account before it can send this USDC payment. You will return here after setup.</p>
                <div className="mt-5 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]"><p className="font-medium text-[var(--foreground)]">No browser wallet needed</p><p className="mt-1 leading-6">Use your Google account to create the payment account for Arc Testnet.</p></div>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={closeReleaseModal} className="w-full justify-center sm:w-auto">Not now</Button><Button onClick={() => { const next = `${window.location.pathname}${window.location.search}`; router.push(`/settings?onboarding=1&next=${encodeURIComponent(next)}`); }} className="w-full justify-center sm:w-auto">Set up payment account</Button></div>
              </>
            ) : releaseModalMode === "method" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Pay milestone</p>
                <h2 id="release-dialog-title" className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">Choose how to record this payment</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{nextReleasableMilestone.title} · {formatUsdc(nextReleasableMilestone.amount)} USDC</p>
                {releaseError ? <p className="mt-3 text-sm text-rose-600">{releaseError}</p> : null}
                <div className="mt-6 space-y-3">
                  {canUseSimulatedPayment ? (
                    <button type="button" onClick={() => setReleaseModalMode("simulated")} className="w-full rounded-2xl border border-[var(--border-strong)] p-4 text-left transition-colors hover:bg-[var(--surface-muted)]">
                      <span className="block font-semibold text-[var(--foreground)]">Simulated payment</span>
                      <span className="mt-1 block text-sm text-[var(--text-muted)]">Record this milestone as paid for testing. No funds will move.</span>
                    </button>
                  ) : null}
                  <button type="button" onClick={() => {
                    if (!recipientAddress) {
                      return;
                    }
                    setReleaseModalMode("review");
                  }} disabled={!recipientAddress} aria-describedby={!recipientAddress ? "wallet-payment-unavailable" : undefined} className="w-full rounded-2xl border border-[var(--border-soft)] p-4 text-left transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-55">
                    <span className="block font-semibold text-[var(--foreground)]">Wallet payment <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">Advanced</span></span>
                    <span className="mt-1 block text-sm text-[var(--text-muted)]">Send USDC from a connected browser wallet. Testnet setup is required.</span>
                  </button>
                  {!recipientAddress ? <p id="wallet-payment-unavailable" className="text-sm text-[var(--text-muted)]">To use Wallet payment, add a wallet address to this contributor first.</p> : null}
                </div>
              </>
            ) : releaseModalMode === "simulated" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Simulated payment</p>
                <h2 id="release-dialog-title" className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">Mark this milestone as paid?</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">This records {formatUsdc(nextReleasableMilestone.amount)} USDC as paid to {recipientName ?? "the contributor"} for {nextReleasableMilestone.title} in the test workflow.</p>
                <div className="mt-5 rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                  <p className="font-semibold">No funds will move</p>
                  <p className="mt-1 leading-5">This does not create a wallet request or a blockchain payment record.</p>
                </div>
                {releaseError ? <p className="mt-4 text-sm text-rose-600">{releaseError}</p> : null}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setReleaseModalMode("method")} disabled={recordingSimulatedPayment} className="w-full justify-center sm:w-auto">Back</Button><Button onClick={() => { void handleSimulatedPayment(); }} disabled={recordingSimulatedPayment} className="w-full justify-center sm:w-auto">{recordingSimulatedPayment ? "Recording payment..." : "Mark as paid (demo)"}</Button></div>
              </>
            ) : releaseModalMode === "review" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{resumeReleaseId ? "Continue payment" : "Review payment"}</p>
                <h2 id="release-dialog-title" className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">{resumeReleaseId ? "Ready to sign" : "Review this payment"}</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{resumeReleaseId ? "This continues the existing payment. SettleFlow will not create another one." : authType === "web2_google" ? "Confirm this payment with your secure payment account." : "Arc Testnet · Review and sign this transfer in your browser wallet."}</p>
                <dl className="mt-5 space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm">
                  <div><dt className="text-xs text-[var(--text-muted)]">You’re paying</dt><dd className="mt-1 text-lg font-semibold text-[var(--foreground)]">{formatUsdc(nextReleasableMilestone.amount)} USDC</dd></div>
                  <div><dt className="text-xs text-[var(--text-muted)]">For milestone</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{nextReleasableMilestone.title}</dd></div>
                  <div><dt className="text-xs text-[var(--text-muted)]">Recipient</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{recipientName ?? "Contributor"}</dd>{authType === "web2_google" ? <dd><details className="mt-2 text-xs text-[var(--text-muted)]"><summary className="cursor-pointer">Technical details</summary><p className="mt-1 break-all font-mono">{recipientAddress ?? "Not resolved"}</p></details></dd> : <dd className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">{recipientAddress ?? "Not resolved"}</dd>}</div>
                  <div><dt className="text-xs text-[var(--text-muted)]">{authType === "web2_google" ? "Payment account" : "Payment wallet"}</dt><dd className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">{authType === "web2_google" ? "Secure payment account" : address ?? "Connect a browser wallet to continue"}</dd></div>
                </dl>
                <p className="mt-4 text-xs text-[var(--text-muted)]">Check the recipient and amount carefully. Confirmed payments cannot be reversed.</p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={closeReleaseModal} disabled={processingRelease} className="w-full justify-center sm:w-auto">Cancel</Button><Button onClick={() => { void handleRelease(resumeReleaseId); }} disabled={processingRelease} className="w-full justify-center sm:w-auto">{processingRelease ? "Preparing payment..." : resumeReleaseId ? "Continue payment" : authType === "web2_google" ? `Confirm ${formatUsdc(nextReleasableMilestone.amount)} USDC` : `Sign ${formatUsdc(nextReleasableMilestone.amount)} USDC`}</Button></div>
              </>
            ) : releaseModalMode === "pending" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Payment processing</p>
                <h2 id="release-dialog-title" className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">We’re confirming your payment</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">Your payment is being checked safely. You do not need to sign, retry, or provide any payment details.</p>
                <div className="mt-5 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]"><p className="font-medium text-[var(--foreground)]">What happens next</p><p className="mt-1 leading-6">This payment will update when confirmation is complete. If it needs attention, SettleFlow will show the next step.</p></div>
                <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={closeReleaseModal} className="w-full justify-center sm:w-auto">Close</Button></div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{requiresPaymentReconnect ? "Payment account" : hasExistingRelease ? "Payment started" : "Payment needs support"}</p>
                <h2 id="release-dialog-title" className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">{requiresPaymentReconnect ? "Reconnect your payment account" : hasExistingRelease ? "Your payment is ready to continue" : "We’re reviewing this payment"}</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{requiresPaymentReconnect ? "Your account is ready, but this browser needs a fresh Circle connection before it can confirm a payment." : hasExistingRelease ? "SettleFlow saved the payment request safely. Load its current status instead of starting another payment." : paymentSupportMessage}</p>
                <div className="mt-5 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]"><p className="font-medium text-[var(--foreground)]">What happens next</p><p className="mt-1 leading-6">{requiresPaymentReconnect ? "Reconnect with Google in Settings, then return here to confirm this payment." : hasExistingRelease ? "After loading, continue the existing Circle confirmation. No second payment will be created." : "SettleFlow will show an update when there is a safe next step."}</p></div>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setReleaseModalMode(null)} className="w-full justify-center sm:w-auto">Close</Button>{requiresPaymentReconnect ? <Button onClick={() => { const next = `${window.location.pathname}${window.location.search}`; router.push(`/settings?onboarding=1&next=${encodeURIComponent(next)}`); }} className="w-full justify-center sm:w-auto">Open Settings</Button> : null}{hasExistingRelease ? <Button onClick={() => { setReleaseModalMode(null); router.refresh(); }} className="w-full justify-center sm:w-auto">Load payment status</Button> : null}</div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
