"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
import { Input } from "@/components/ui/input";
import type { Milestone } from "@/lib/models/milestone";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import type { PaymentAttempt } from "@/lib/models/payment-attempt";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { PRODUCT_CONTEXT_HEADER_NAMES, type ProductActor } from "@/lib/runtime/product-context";
import { hasRole, isRole } from "@/lib/runtime/role-utils";
import { useWallet } from "@/lib/context/wallet-context";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";
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

function getFailedPaymentGuidance(message: string | null) {
  const normalized = message?.toLowerCase() ?? "";

  if (isRealExecutionAuthorizationError(message)) {
    return [
      "No payment was sent and no payment record was created.",
      "An administrator must finish the staging safety checks before payments can be enabled.",
      "Do not retry until the environment is explicitly authorized.",
    ];
  }

  if (normalized.includes("network connection failed") || normalized.includes("arc testnet")) {
    return [
      "Keep your wallet open.",
      "Switch it to Arc Testnet and check that it is connected.",
      "Try the payment again only after the connection is restored.",
    ];
  }

  if (normalized.includes("rejected") || normalized.includes("cancelled")) {
    return [
      "No payment was sent from the cancelled wallet request.",
      "When you are ready, start the payment again and approve it in your wallet.",
    ];
  }

  return [
    "Check your wallet activity for a USDC transfer with this amount and recipient.",
    "If you find one, do not start another payment.",
    "If no payment was sent, you can start a new one.",
  ];
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
  const [findingTransaction, setFindingTransaction] = useState(false);
  const [confirmationTxHash, setConfirmationTxHash] = useState("");
  const [foundTransaction, setFoundTransaction] = useState<{ txHash: string; explorerUrl: string } | null>(null);
  const [activeProof, setActiveProof] = useState<TransactionProof | undefined>(releaseProof);
  const [releaseModalMode, setReleaseModalMode] = useState<"method" | "review" | "simulated" | "pending" | "failed" | null>(null);
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
  const shouldShowPaymentAction = isOwnerActor && (
    effectiveReleaseStatus === "submitting" ||
    effectiveReleaseStatus === "failed"
  );
  const shouldShowPaymentRecord = Boolean(
    resolvedProof && (resolvedProof.status === "confirmed" || resolvedProof.txHash),
  );
  const failedBeforeBroadcast = resolvedProof?.failureReason?.startsWith("BROWSER_WALLET_PRE_BROADCAST:") ?? false;
  const isNetworkPreBroadcastFailure = failedBeforeBroadcast || Boolean(releaseError?.toLowerCase().includes("network connection failed"));
  const isRealExecutionBlocked = isRealExecutionAuthorizationError(releaseError);
  const actionableReleaseError = paymentActionErrorMessage(releaseError);
  const failedPaymentGuidance = getFailedPaymentGuidance(resolvedProof?.failureReason ?? releaseError);
  const isModalActionPending = processingRelease || recordingSimulatedPayment || retryingRelease || refreshingProof || findingTransaction;
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

  useEffect(() => {
    if (
      !reviewRequest ||
      reviewRequest === handledReviewRequest.current ||
      !isOwnerActor ||
      !nextReleasableMilestone
    ) return;
    handledReviewRequest.current = reviewRequest;
    openPaymentMethod();
  }, [isOwnerActor, nextReleasableMilestone, reviewRequest]);

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

  const canUseSimulatedPayment = ARC_CONFIG.executionMode === "demo" || ARC_CONFIG.executionMode === "mock";

  function openPaymentMethod() {
    setReleaseError(null);
    setResumeReleaseId(undefined);
    setReleaseModalMode("method");
  }

  function closeReleaseModal() {
    if (!isModalActionPending) setReleaseModalMode(null);
  }

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
      setReleaseModalMode("failed");
      return;
    }
    if (ARC_CONFIG.executionMode === "real") {
      try {
        await assertPaymentEnvironmentReady();
        if (!address) throw new Error("The authenticated Web3 wallet address is unavailable. Sign in again before releasing.");
        await assertBrowserWalletMatchesAuthenticatedAccount(address);
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
        setReleaseError(data.error ?? "Release request failed.");
        setReleaseStatus("failed");
        setReleaseModalMode("failed");
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
            setConfirmationTxHash("");
            setFoundTransaction(null);
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
        setReleaseModalMode("failed");
        return;
      }

      setActiveProof(result);
      if (result.status === "failed") {
        result.failureReason = data.proof?.failureReason;
      }
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
      if (result.status === "failed") {
        setReleaseModalMode("failed");
      } else if (result.status === "confirmed") {
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

  function focusPendingSettlementResolution() {
    setConfirmationTxHash(resolvedProof?.txHash ?? "");
    setFoundTransaction(null);
    setReleaseModalMode("pending");
  }

  async function handleFindReleaseTransaction() {
    if (!isOwnerActor || !resolvedProof?.releaseId || findingTransaction) return;
    setReleaseError(null);
    setFoundTransaction(null);
    setFindingTransaction(true);
    try {
      const response = await fetch(`/api/v1/releases/${resolvedProof.releaseId}/browser-candidates`, {
        method: "POST",
        headers: productContextHeaders,
      });
      const data = (await response.json()) as {
        error?: string;
        candidates?: Array<{ txHash: string; explorerUrl: string }>;
      };
      if (!response.ok || data.error || !data.candidates) {
        throw new Error(data.error ?? "Unable to check for a payment right now.");
      }
      if (data.candidates.length === 1) {
        const candidate = data.candidates[0];
        setConfirmationTxHash(candidate.txHash);
        setFoundTransaction(candidate);
        return;
      }
      if (data.candidates.length === 0) {
        setReleaseError("No confirmed payment matching this release was found yet. This payment remains locked; check again later instead of retrying.");
        return;
      }
      setReleaseError("More than one matching payment was found. This payment remains locked so a transaction cannot be selected automatically.");
    } catch {
      setReleaseError("We couldn’t check for a payment right now. This payment remains locked, so do not sign or retry again. Try checking again in a moment.");
    } finally {
      setFindingTransaction(false);
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
    } catch {
      setReleaseError("We couldn’t prepare another payment. The previous attempt is unchanged. Review your wallet activity before trying again.");
      setReleaseStatus("failed");
      return null;
    } finally {
      setRetryingRelease(false);
    }
  }

  async function handleRefreshProof() {
    if (!isOwnerActor || !resolvedProof?.releaseId || refreshingProof) {
      return false;
    }

    const txHash = confirmationTxHash.trim();
    if (txHash.length === 0) {
      setReleaseError("Tx hash is required to confirm settlement proof.");
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
          status: "confirmed",
          txHash,
          network: "Arc Testnet",
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
      setReleaseStatus("confirmed");
      onReleaseSuccess?.({
        milestoneId: resolvedMilestoneId,
        proof: updatedProof,
        releasedAt: proof.confirmedAt ?? new Date().toISOString(),
      });
      setConfirmationTxHash("");
      return true;
    } catch {
      setReleaseError("We couldn’t verify this transaction yet. The payment remains pending; do not retry or sign again. Check the transaction and try verification again later.");
      setReleaseStatus("submitting");
      return false;
    } finally {
      setRefreshingProof(false);
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
              ) : isBrowserReconciliationPending ? (
                <><p className="font-semibold text-[var(--foreground)]">Payment sent — verify it</p><p className="mt-1 text-[var(--text-muted)]">Do not sign again. Verify the transaction already sent from your wallet.</p></>
              ) : effectiveReleaseStatus === "failed" ? (
                isNetworkPreBroadcastFailure
                  ? <><p className="font-semibold text-[var(--foreground)]">Payment wasn’t sent</p><p className="mt-1 text-[var(--text-muted)]">Your wallet could not reach Arc Testnet. Check its network, then safely try again.</p></>
                  : <><p className="font-semibold text-[var(--foreground)]">Payment needs your decision</p><p className="mt-1 text-[var(--text-muted)]">The previous attempt was unsuccessful. Review the next steps before starting another payment.</p></>
              ) : isBrowserReleasable ? (
                <><p className="font-semibold text-[var(--foreground)]">Continue payment</p><p className="mt-1 text-[var(--text-muted)]">Continue the existing payment. SettleFlow will not create another one.</p></>
              ) : nextReleasableMilestone ? (
                <><p className="font-semibold text-[var(--foreground)]">Ready to pay {formatUsdc(nextReleasableMilestone.amount)} USDC</p><p className="mt-1 text-[var(--text-muted)]">Choose how you want to record this payment.</p></>
              ) : null}
            </div>
            {isCircleSettlementPending ? <Button onClick={() => { void handleRefreshCircleSettlement(); }}>Check payment</Button>
              : needsCircleConfirmation ? <Button onClick={() => { void handleContinueCircleRelease(); }}>Continue confirmation</Button>
                : isBrowserReconciliationPending ? <Button onClick={focusPendingSettlementResolution}>Verify payment</Button>
                  : effectiveReleaseStatus === "failed" ? <Button onClick={() => setReleaseModalMode("failed")}>{isNetworkPreBroadcastFailure ? "Check wallet & try again" : "Review next steps"}</Button>
                    : isBrowserReleasable ? <Button onClick={() => openReleaseReview(resolvedProof?.releaseId)}>Continue payment</Button>
                      : nextReleasableMilestone ? <Button onClick={openPaymentMethod}>Pay {formatUsdc(nextReleasableMilestone.amount)} USDC</Button>
                        : null}
          </div>
          {actionableReleaseError ? <p className="mt-3 text-sm text-rose-600">{actionableReleaseError}</p> : null}
          <details className="mt-4 border-t border-[var(--border-soft)] pt-3"><summary className="cursor-pointer font-medium text-[var(--foreground)]">Wallet payment details</summary><div className="mt-3 space-y-2 text-xs text-[var(--text-muted)]"><p>Recipient wallet: <span className="break-all font-mono text-[var(--text-primary)]">{recipientAddress ?? "Not resolved"}</span></p><p>Your wallet: <span className="font-mono text-[var(--text-primary)]">{address ? shortenAddress(address) : "Not connected"}</span></p><p>Network: Arc Testnet</p></div></details>
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
            {releaseModalMode === "method" ? (
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{resumeReleaseId ? "Continue existing payment" : "Review payment"}</p>
                <h2 id="release-dialog-title" className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">{resumeReleaseId ? "Ready for wallet signature" : "Confirm before signing"}</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{resumeReleaseId ? "This continues the existing payment. SettleFlow will not create another one." : "SettleFlow will verify your active wallet before starting the payment. You will then sign the USDC transfer in your browser wallet."}</p>
                <dl className="mt-5 space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm">
                  <div><dt className="text-xs text-[var(--text-muted)]">Milestone</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{nextReleasableMilestone.title}</dd></div>
                  <div><dt className="text-xs text-[var(--text-muted)]">Amount</dt><dd className="mt-1 text-lg font-semibold text-[var(--foreground)]">{formatUsdc(nextReleasableMilestone.amount)} USDC</dd></div>
                  <div><dt className="text-xs text-[var(--text-muted)]">Recipient</dt><dd className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">{recipientAddress ?? "Not resolved"}</dd></div>
                  <div><dt className="text-xs text-[var(--text-muted)]">Authenticated Web3 wallet</dt><dd className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">{address ?? "Sign in with Web3 first"}</dd></div>
                </dl>
                <p className="mt-4 text-xs text-[var(--text-muted)]">If your connected wallet has a different active account, SettleFlow will stop before starting the payment and show you which account to switch.</p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={closeReleaseModal} disabled={processingRelease} className="w-full justify-center sm:w-auto">Cancel</Button><Button onClick={() => { void handleRelease(resumeReleaseId); }} disabled={processingRelease} className="w-full justify-center sm:w-auto">{processingRelease ? "Preparing wallet..." : resumeReleaseId ? "Verify wallet & continue" : "Verify wallet & sign"}</Button></div>
              </>
            ) : releaseModalMode === "pending" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Payment status unknown</p>
                <h2 id="release-dialog-title" className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">We’re checking this payment</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">SettleFlow did not receive a transaction hash from your wallet. Do not sign or retry again while this payment is being reconciled.</p>
                {resolvedProof?.txHash ? <a href={`${ARC_CONFIG.explorerUrl}/tx/${resolvedProof.txHash}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex text-sm font-medium text-[var(--foreground)] underline underline-offset-4">View submitted transaction</a> : null}
                <div className="mt-5 space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">Find my payment</p>
                  <p className="text-xs leading-5 text-[var(--text-muted)]">SettleFlow checks for a confirmed payment from the payment wallet to this contributor, for the exact milestone amount.</p>
                  <Button onClick={() => { void handleFindReleaseTransaction(); }} disabled={findingTransaction}>{findingTransaction ? "Checking Arc..." : "Check for payment"}</Button>
                  {foundTransaction ? <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-800 dark:text-emerald-100"><p className="font-medium">We found one matching payment.</p><a href={foundTransaction.explorerUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block underline underline-offset-2">View transaction</a><div className="mt-3"><Button onClick={() => { void handleRefreshProof().then((resolved) => { if (resolved) setReleaseModalMode(null); }); }} disabled={refreshingProof}>{refreshingProof ? "Confirming payment..." : "Confirm payment"}</Button></div></div> : null}
                </div>
                <details className="mt-5 border-t border-[var(--border-soft)] pt-4 text-sm text-[var(--text-muted)]">
                  <summary className="cursor-pointer font-medium text-[var(--foreground)]">Can’t find a transaction?</summary>
                  <p className="mt-3 leading-6">Check the active wallet’s Activity on Arc Testnet for a USDC transfer with this milestone’s amount and recipient. If you are not certain which transaction is correct, leave this payment pending. Retrying is intentionally locked to prevent a duplicate payment.</p>
                  <p className="mt-2 leading-6">A retry is available only when SettleFlow knows the wallet request was cancelled before a transaction was submitted.</p>
                  <label className="mt-4 block text-sm font-medium text-[var(--foreground)]" htmlFor="payment-transaction-hash">Enter a transaction hash manually</label>
                  <Input id="payment-transaction-hash" value={confirmationTxHash} onChange={(event) => { setConfirmationTxHash(event.target.value); setFoundTransaction(null); }} placeholder="Paste the 0x… transaction hash from your wallet" className="mt-2.5" />
                  <Button className="mt-3" onClick={() => { void handleRefreshProof().then((resolved) => { if (resolved) setReleaseModalMode(null); }); }} disabled={refreshingProof}>{refreshingProof ? "Verifying payment..." : "Verify transaction"}</Button>
                </details>
                {releaseError ? <p className="mt-3 text-sm text-rose-600">{releaseError}</p> : null}
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{isRealExecutionBlocked ? "Payments unavailable" : "Payment needs attention"}</p>
                <h2 id="release-dialog-title" className="mt-2 pr-8 text-xl font-semibold text-[var(--foreground)]">{isRealExecutionBlocked ? "Payments aren’t enabled in this environment" : isNetworkPreBroadcastFailure ? "Check your wallet, then try again" : "Review the previous payment attempt"}</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{isRealExecutionBlocked ? "No payment was sent. This test environment has not been authorized for live testnet payments yet." : isNetworkPreBroadcastFailure ? "No payment was sent. In your wallet, switch to Arc Testnet and confirm you are online. You can then safely start a new payment." : "SettleFlow marked the prior attempt as unsuccessful. Starting again creates a separate payment attempt; it does not resend the earlier one."}</p>
                <ol className="mt-4 space-y-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
                  {failedPaymentGuidance.map((step, index) => (
                    <li key={step} className="flex gap-2"><span className="font-semibold text-[var(--foreground)]">{index + 1}.</span><span>{step}</span></li>
                  ))}
                </ol>
                {!isNetworkPreBroadcastFailure && !isRealExecutionBlocked ? <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"><p className="font-semibold">Before you continue</p><p className="mt-1 leading-5">Check your wallet activity first. If you find a completed USDC transfer for this milestone, do not start another payment.</p></div> : null}
                {resolvedProof?.failureReason ? <details className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-muted)]"><summary className="cursor-pointer font-medium text-[var(--foreground)]">Technical details</summary><p className="mt-2 break-all font-mono text-xs">{resolvedProof.failureReason}</p></details> : null}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setReleaseModalMode(null)} className="w-full justify-center sm:w-auto">{isRealExecutionBlocked ? "Close" : "Cancel"}</Button>{!isRealExecutionBlocked ? <Button onClick={() => { void handleRetryRelease().then((releaseId) => { if (releaseId) openReleaseReview(releaseId); }); }} disabled={retryingRelease} className="w-full justify-center sm:w-auto">{retryingRelease ? "Preparing payment..." : isNetworkPreBroadcastFailure ? "Try payment again" : "Start a new payment"}</Button> : null}</div>
                {actionableReleaseError ? <p className="mt-3 text-sm text-rose-600">{actionableReleaseError}</p> : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
