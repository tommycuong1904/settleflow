/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";

import { ActivityTimeline } from "@/components/payouts/activity-timeline";
import { MilestoneRow } from "@/components/milestones/milestone-row";
import { PayoutDetailReleaseShell } from "@/components/payouts/payout-detail-release-shell";
import { Button } from "@/components/shared/button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/context/toast-context";
import type { ActivityItem } from "@/lib/models/activity-item";
import type { Contributor } from "@/lib/models/contributor";
import type { Milestone } from "@/lib/models/milestone";
import type { Payout } from "@/lib/models/payout";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import type { PaymentAttempt } from "@/lib/models/payment-attempt";
import type { ProductActor } from "@/lib/runtime/product-context";
import { PRODUCT_CONTEXT_HEADER_NAMES } from "@/lib/runtime/product-context";
import { PayoutReceiptModal } from "@/components/payouts/payout-receipt-modal";
import { formatUsdc } from "@/lib/utils/format";
import { FileCheck } from "lucide-react";
import { isRole } from "@/lib/runtime/role-utils";
import { notifyWorkflowUpdated } from "@/lib/runtime/workflow-sync";

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
  initialPaymentAttempts: PaymentAttempt[];
  initialActivity: ActivityItem[];
  currentActor: ProductActor;
  workspaceId: string;
};

function getStorageKey(payoutId: string) {
  return `settleflow:release:${payoutId}`;
}

function normalizeDraftMilestones(
  milestones: Array<{ id: string; title: string; description: string; amount: string }>,
) {
  return milestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title.trim(),
    description: milestone.description.trim(),
    amount: milestone.amount.trim(),
  }));
}

function getMilestoneAmountError(amount: string) {
  const normalized = amount.trim();
  if (!normalized) return "Amount is required.";
  if (!/^\d+(\.\d+)?$/.test(normalized)) return "Amount must be a valid USDC number.";
  if (Number(normalized) <= 0) return "Amount must be greater than zero.";
  if ((normalized.split(".")[1]?.length ?? 0) > 6) return "Amount can have up to 6 decimal places.";
  return null;
}

export function PayoutDetailClient({
  payout,
  contributor,
  initialMilestones,
  initialReleaseProof,
  initialPaymentAttempts,
  initialActivity,
  currentActor,
  workspaceId,
}: PayoutDetailClientProps) {
  const isOwnerActor = isRole(currentActor, "owner");
  const canApproveMilestones = isOwnerActor;
  const [persistedRelease, setPersistedRelease] = useState<PersistedReleaseState | null>(() => {
    if (typeof window === "undefined" || initialReleaseProof) return null;

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
  const [payoutStatusState, setPayoutStatusState] = useState(payout.status);
  const [paymentAttempts, setPaymentAttempts] = useState(initialPaymentAttempts);
  const [payoutTotalAmountState, setPayoutTotalAmountState] = useState(payout.totalAmount);
  const [payoutTitleCommitted, setPayoutTitleCommitted] = useState(payout.title);

  const [payoutTitleState, setPayoutTitleState] = useState(payout.title);
  const [payoutDescriptionCommitted, setPayoutDescriptionCommitted] = useState(payout.description ?? "");
  const [payoutDescriptionState, setPayoutDescriptionState] = useState(payout.description ?? "");
  const [draftMilestonesCommitted, setDraftMilestonesCommitted] = useState(() => initialMilestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    amount: milestone.amount.toString(),
  })));
  const [draftMilestonesState, setDraftMilestonesState] = useState(() => initialMilestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    amount: milestone.amount.toString(),
  })));
  const [activityItems, setActivityItems] = useState(initialActivity);
  const [draftSaveNotice, setDraftSaveNotice] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [submitRequestMilestoneId, setSubmitRequestMilestoneId] = useState<string | null>(null);
  const [releaseReviewRequest, setReleaseReviewRequest] = useState(0);
  const { toast } = useToast();

  const [activatingPayout, setActivatingPayout] = useState(false);
  const [savingDraftTitle, setSavingDraftTitle] = useState(false);

  useEffect(() => {
    if (!initialReleaseProof || !persistedRelease) {
      return;
    }

    if (persistedRelease.proof.id !== initialReleaseProof.id) {
      return;
    }

    setPersistedRelease(null);
    window.sessionStorage.removeItem(getStorageKey(payout.id));
  }, [initialReleaseProof, payout.id, persistedRelease]);

  useEffect(() => {
    setMilestoneState(initialMilestones);
    setPayoutStatusState(payout.status);
    setPaymentAttempts(initialPaymentAttempts);
    setPayoutTotalAmountState(payout.totalAmount);
    setPayoutTitleCommitted(payout.title);
    setPayoutTitleState(payout.title);
    setPayoutDescriptionCommitted(payout.description ?? "");
    setPayoutDescriptionState(payout.description ?? "");
    setDraftMilestonesCommitted(
      initialMilestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount.toString(),
      })),
    );
    setDraftMilestonesState(
      initialMilestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount.toString(),
      })),
    );
    setActivityItems(initialActivity);
    setReviewError(null);
    setActivatingPayout(false);
    setSavingDraftTitle(false);
  }, [initialActivity, initialMilestones, initialPaymentAttempts, payout.description, payout.status, payout.title, payout.totalAmount]);

  useEffect(() => {
    if (!draftSaveNotice) return;
    const timeout = window.setTimeout(() => setDraftSaveNotice(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [draftSaveNotice]);

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
  const submittedMilestoneCount = milestones.filter(
    (milestone) => milestone.status === "submitted",
  ).length;
  const nextSubmittedMilestone = milestones.find(
    (milestone) => milestone.status === "submitted",
  );
  const nextContributorMilestone = milestones.find(
    (milestone) => milestone.status === "pending" || milestone.status === "rejected",
  );
  const releasedCount = milestones.filter(
    (milestone) => milestone.status === "released",
  ).length;
  const amountReleased = milestones
    .filter((milestone) => milestone.status === "released")
    .reduce((sum, milestone) => sum + milestone.amount, 0);

  const effectivePayoutStatus =
    releasedCount === milestones.length && milestones.length > 0
      ? "completed"
      : releasedCount > 0
        ? "partially_released"
        : payoutStatusState;

  const payoutStatusLabel =
    effectivePayoutStatus === "partially_released"
      ? "Partially paid"
      : effectivePayoutStatus === "active"
        ? amountReleased > 0
          ? "Partially paid"
          : "In progress"
        : effectivePayoutStatus === "completed"
          ? "Completed"
          : "Draft";

  const payoutStatusTone =
    effectivePayoutStatus === "completed"
      ? "bg-emerald-500"
      : payoutStatusLabel === "Partially paid"
        ? "bg-sky-500"
        : effectivePayoutStatus === "active"
          ? "bg-cyan-500"
          : "bg-[var(--text-muted)]";

  const activeHandoff = effectivePayoutStatus === "active" || effectivePayoutStatus === "partially_released"
    ? isOwnerActor && nextSubmittedMilestone
      ? {
        label: "Next step",
        title: `Review ${nextSubmittedMilestone.title}`,
        description: "Submitted work is ready for your decision. Approval makes payment available.",
        href: `#milestone-${nextSubmittedMilestone.id}`,
        action: "Review work",
      }
      : isOwnerActor && nextContributorMilestone
        ? {
          label: "Up next",
          title: "Waiting for a contributor to submit work",
          description: `The next milestone is ${nextContributorMilestone.title}. You will be able to review it when it is submitted.`,
        }
        : isOwnerActor && nextReleasableMilestone
          ? {
            label: "Ready to pay",
            title: `${nextReleasableMilestone.title} is approved`,
            description: "Payment is the next step. Use the payment action on this milestone when you are ready.",
          }
        : !isOwnerActor && nextContributorMilestone
          ? {
            label: "Your next step",
            title: `Submit ${nextContributorMilestone.title}`,
            description: nextContributorMilestone.status === "rejected"
              ? "Review the requested changes, then resubmit your work for approval."
              : "Share the completed work so the workspace owner can review it.",
            submitMilestoneId: nextContributorMilestone.id,
            action: nextContributorMilestone.status === "rejected" ? "Resubmit work" : "Submit work for review",
          }
          : !isOwnerActor && nextSubmittedMilestone
            ? {
              label: "Awaiting review",
              title: "Your work is with the workspace owner",
              description: "The workspace owner will approve it or request changes before payment can continue.",
              href: `#milestone-${nextSubmittedMilestone.id}`,
              action: "View submission",
            }
            : !isOwnerActor && nextReleasableMilestone
              ? {
                label: "Payment on the way",
                title: `${nextReleasableMilestone.title} is approved`,
                description: "The workspace owner can now send payment. You will see the confirmation here when it is complete.",
              }
            : null
    : null;

  const draftMilestonesDirty = JSON.stringify(normalizeDraftMilestones(draftMilestonesState)) !==
    JSON.stringify(normalizeDraftMilestones(draftMilestonesCommitted));
  const draftTitleDirty = payoutTitleState.trim() !== payoutTitleCommitted;
  const draftDescriptionDirty = payoutDescriptionState.trim() !== payoutDescriptionCommitted;
  const hasUnsavedDraftChanges = draftTitleDirty || draftDescriptionDirty || draftMilestonesDirty;
  const milestoneAmountErrors = draftMilestonesState.map((milestone) => getMilestoneAmountError(milestone.amount));
  const milestoneDirtyStates = normalizeDraftMilestones(draftMilestonesState).map((milestone, index) => {
    const committed = normalizeDraftMilestones(draftMilestonesCommitted)[index];
    return {
      title: milestone.title !== committed?.title,
      description: milestone.description !== committed?.description,
      amount: milestone.amount !== committed?.amount,
    };
  });
  const hasMilestoneAmountError = milestoneAmountErrors.some((error) => error !== null);
  const hasDraftMilestones = draftMilestonesState.length > 0;
  const draftDetailsReady = !draftTitleDirty && !draftDescriptionDirty && payoutTitleState.trim().length > 0;
  const draftMilestonePlanReady = hasDraftMilestones && !draftMilestonesDirty && !hasMilestoneAmountError;
  const canActivateDraft = !activatingPayout && !hasUnsavedDraftChanges && hasDraftMilestones && !hasMilestoneAmountError && payoutTitleState.trim().length > 0;
  const draftActivationMessage = hasUnsavedDraftChanges
    ? "Save your draft changes before activation."
    : !hasDraftMilestones
      ? "Add at least one milestone before activation."
    : hasMilestoneAmountError
      ? "Fix the milestone amounts before activation."
      : payoutTitleState.trim().length === 0
        ? "Add a payout title before activation."
        : "Activation lets contributors submit work for review. You can then approve each milestone when it is complete.";

  async function activatePayout() {
    if (activatingPayout || payoutStatusState !== "draft") return;

    setReviewError(null);
    setActivatingPayout(true);
    try {
      const response = await fetch(`/api/v1/payouts/${payout.id}/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [PRODUCT_CONTEXT_HEADER_NAMES.workspaceId]: workspaceId,
        },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as { error?: string; payout?: { status?: Payout["status"] } };
      if (!response.ok) throw new Error(data.error ?? "Unable to activate payout.");
      setPayoutStatusState(data.payout?.status ?? "active");
      toast({
        variant: "success",
        title: "Payout Activated",
        description: "Draft is now active. Milestones can be submitted.",
      });
      notifyWorkflowUpdated();
      await refreshActivity();
    } catch {
      setReviewError("We couldn’t activate this payout. It is still a draft. Try again in a moment.");
    } finally {
      setActivatingPayout(false);
    }
  }

  async function refreshActivity() {
    const response = await fetch(`/api/v1/payouts/${payout.id}/activity`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        [PRODUCT_CONTEXT_HEADER_NAMES.workspaceId]: workspaceId,
      },
    });
    if (!response.ok) return;
    const data = (await response.json()) as { data?: ActivityItem[] };
    if (Array.isArray(data.data)) {
      setActivityItems(data.data);
    }
  }

  async function saveDraftFields(fields: {
    title?: string;
    description?: string;
    milestones?: Array<{
      title: string;
      description: string;
      amountUsdc: string;
      sequence: number;
    }>;
  }) {
    const response = await fetch(`/api/v1/payouts/${payout.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        [PRODUCT_CONTEXT_HEADER_NAMES.workspaceId]: workspaceId,
      },
      body: JSON.stringify(fields),
    });
    const data = (await response.json()) as {
      error?: string;
      payout?: {
        id: string;
        status: Payout["status"];
        title: string;
        description: string | null;
        totalAmountUsdc: string;
        milestoneCount: number;
        milestones: Array<{
          id: string;
          title: string;
          description: string;
          amountUsdc: string;
          sequence: number;
        }>;
      };
    };
    if (!response.ok) throw new Error(data.error ?? "Unable to update payout draft.");
    await refreshActivity();
    return data.payout;
  }

  async function saveDraftDetails() {
    if (savingDraftTitle || payoutStatusState !== "draft") return;

    const nextTitle = payoutTitleState.trim();
    const nextDescription = payoutDescriptionState.trim();
    if (!nextTitle) {
      setReviewError("Add a payout title before saving the draft.");
      return;
    }
    if (!draftTitleDirty && !draftDescriptionDirty) return;

    setReviewError(null);
    setDraftSaveNotice(null);
    setSavingDraftTitle(true);
    try {
      const updated = await saveDraftFields({
        title: draftTitleDirty ? nextTitle : undefined,
        description: draftDescriptionDirty ? nextDescription : undefined,
      });
      const resolvedTitle = updated?.title ?? nextTitle;
      const resolvedDescription = updated?.description ?? nextDescription;
      setPayoutTitleCommitted(resolvedTitle);
      setPayoutTitleState(resolvedTitle);
      setPayoutDescriptionCommitted(resolvedDescription);
      setPayoutDescriptionState(resolvedDescription);
      setPayoutTotalAmountState(Number(updated?.totalAmountUsdc ?? payoutTotalAmountState));
      setDraftSaveNotice("Draft details saved.");
      toast({
        variant: "info",
        title: "Draft Saved",
        description: "Payout details have been updated.",
        durationMs: 2500,
      });
    } catch {
      setReviewError("We couldn’t save these draft changes. Your last saved version is unchanged. Try again in a moment.");
      setPayoutTitleState(payoutTitleCommitted);
      setPayoutDescriptionState(payoutDescriptionCommitted);
    } finally {
      setSavingDraftTitle(false);
    }
  }

  async function saveDraftMilestones() {
    if (savingDraftTitle || payoutStatusState !== "draft" || !draftMilestonesDirty || hasMilestoneAmountError) return;

    const normalized = draftMilestonesState.map((milestone, index) => ({
      title: milestone.title.trim(),
      description: milestone.description.trim(),
      amountUsdc: milestone.amount.trim(),
      sequence: index + 1,
    }));

    if (normalized.some((milestone) => !milestone.title || !milestone.description || !milestone.amountUsdc)) {
      setReviewError("Each draft milestone needs a title, description, and amount.");
      return;
    }

    setReviewError(null);
    setDraftSaveNotice(null);
    setSavingDraftTitle(true);
    try {
      const updated = await saveDraftFields({ milestones: normalized });
      const resolvedMilestones = updated?.milestones?.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amountUsdc,
      })) ?? draftMilestonesState;
      setDraftMilestonesCommitted(resolvedMilestones);
      setDraftMilestonesState(resolvedMilestones);
      setPayoutTotalAmountState(Number(updated?.totalAmountUsdc ?? payoutTotalAmountState));
      setDraftSaveNotice("Draft milestones saved.");
      toast({
        variant: "info",
        title: "Draft Saved",
        description: "Milestones and allocations updated.",
        durationMs: 2500,
      });
      if (updated?.title) {
        setPayoutTitleCommitted(updated.title);
        setPayoutTitleState(updated.title);
      }
      setPayoutDescriptionCommitted(updated?.description ?? payoutDescriptionState);
      setPayoutDescriptionState(updated?.description ?? payoutDescriptionState);
      setMilestoneState((current) =>
        current.map((milestone, index) => ({
          ...milestone,
          id: updated?.milestones?.[index]?.id ?? milestone.id,
          title: updated?.milestones?.[index]?.title ?? milestone.title,
          description: updated?.milestones?.[index]?.description ?? milestone.description,
          amount: Number(updated?.milestones?.[index]?.amountUsdc ?? milestone.amount),
        })),
      );
    } catch {
      setReviewError("We couldn’t save these draft changes. Your last saved version is unchanged. Try again in a moment.");
      setDraftMilestonesState(draftMilestonesCommitted);
    } finally {
      setSavingDraftTitle(false);
    }
  }

  function handleMilestoneStatusChange(
    milestoneId: string,
    status: Milestone["status"],
    meta?: { submittedAt?: string; approvedAt?: string; rejectedAt?: string; releasedAt?: string },
  ) {
    setMilestoneState((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId
          ? {
            ...milestone,
            status,
            submittedAt:
              status === "submitted"
                ? meta?.submittedAt ?? milestone.submittedAt
                : milestone.submittedAt,
            approvedAt: status === "approved" ? meta?.approvedAt ?? milestone.approvedAt : milestone.approvedAt,
            rejectedAt: status === "rejected" ? meta?.rejectedAt ?? milestone.rejectedAt : milestone.rejectedAt,
            releasedAt: status === "released" ? meta?.releasedAt ?? milestone.releasedAt : milestone.releasedAt,
          }
          : milestone,
      ),
    );
    if (status === "submitted") {
      toast({
        variant: "success",
        title: "Work submitted for review",
        description: "It is ready for the workspace owner to review.",
      });
    }
    notifyWorkflowUpdated();
    void refreshActivity();
  }

  async function reviewMilestone(milestoneId: string, decision: "approved" | "rejected", comment?: string) {
    setReviewError(null);
    try {
      const response = await fetch(`/api/v1/milestones/${milestoneId}/${decision === "approved" ? "approve" : "reject"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [PRODUCT_CONTEXT_HEADER_NAMES.workspaceId]: workspaceId,
        },
        body: JSON.stringify(decision === "rejected" ? { comment } : {}),
      });
      const data = (await response.json()) as {
        error?: string;
        milestone?: {
          status: Milestone["status"];
          approvedAt?: string | null;
          rejectedAt?: string | null;
        };
      };
      if (!response.ok) throw new Error(data.error ?? `Unable to ${decision} milestone.`);
      setMilestoneState((current) =>
        current.map((milestone) =>
          milestone.id === milestoneId
            ? {
              ...milestone,
              status: data.milestone?.status ?? decision,
              approvedAt:
                decision === "approved"
                  ? (data.milestone?.approvedAt ?? milestone.approvedAt)
                  : milestone.approvedAt,
              rejectedAt:
                decision === "rejected"
                  ? (data.milestone?.rejectedAt ?? milestone.rejectedAt)
                  : milestone.rejectedAt,
            }
            : milestone,
        ),
      );
      toast({
        variant: decision === "approved" ? "success" : "warning",
        title: `Milestone ${decision === "approved" ? "Approved" : "Rejected"}`,
        description: decision === "approved" 
          ? "Deliverable accepted. Ready for payment."
          : "Revisions requested. Contributor notified.",
      });
      await refreshActivity();
    } catch {
      setReviewError(`We couldn’t ${decision === "approved" ? "approve" : "request changes for"} this milestone. Its status has not changed. Try again in a moment.`);
    } finally {
    }
  }

  function handleApproveMilestone(milestoneId: string) {
    return reviewMilestone(milestoneId, "approved");
  }

  function handleRejectMilestone(milestoneId: string, comment?: string) {
    return reviewMilestone(milestoneId, "rejected", comment);
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
    toast({
      variant: "success",
      title: "Payment confirmed",
      description: "The milestone is marked as paid. Transaction details are available in Payment details.",
    });
    notifyWorkflowUpdated();
    void refreshActivity();
  }

  function handleSimulatedPaymentSuccess(payload: { milestoneId: string; completedAt: string; payoutStatus?: "active" | "partially_released" | "completed"; payment: PaymentAttempt }) {
    setMilestoneState((current) => current.map((milestone) => milestone.id === payload.milestoneId ? { ...milestone, status: "released" as const, releasedAt: payload.completedAt } : milestone));
    if (payload.payoutStatus) setPayoutStatusState(payload.payoutStatus);
    setPaymentAttempts((current) => current.some((payment) => payment.id === payload.payment.id) ? current : [payload.payment, ...current]);
    toast({ variant: "success", title: "Payment recorded for testing", description: "No funds moved." });
    notifyWorkflowUpdated();
    void refreshActivity();
  }

  return (
    <div className="sf-container flex flex-col py-10 md:py-12">
      <div className="flex flex-col gap-8">
        {/* Header with Export Receipt CTA */}
        <PageHeader
          eyebrow="Payout detail"
          title={payoutTitleState}
          description={
            payoutDescriptionState.trim().length > 0
              ? payoutDescriptionState
              : isOwnerActor
                ? "Review milestone submissions, approve work in sequence, and keep payment records together."
                : "Submit your work, respond to feedback, and track payment progress."
          }
        >
          {isOwnerActor && effectivePayoutStatus !== "draft" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsReceiptModalOpen(true)}
              icon={<FileCheck size={15} className="text-[var(--accent-cyan)]" />}
            >
              Export Payout Summary
            </Button>
          ) : null}
        </PageHeader>

        <section className="px-1">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Payout overview</h2>
          </div>
          <div className={`mt-4 grid gap-y-5 border-y border-[var(--border-soft)] py-4 sm:grid-cols-2 ${isOwnerActor ? "xl:grid-cols-4 xl:divide-x xl:divide-[var(--border-soft)]" : "max-w-2xl sm:divide-x sm:divide-[var(--border-soft)]"}`}>
            {isOwnerActor ? (
              <>
                <div className="xl:pr-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Contributor</p>
                  <p className="mt-2 break-all text-sm font-semibold text-[var(--foreground)]">{contributor?.name ?? payout.contributorId}</p>
                </div>
                <div className="xl:px-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Payment setup</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                    {contributor?.walletAddress ? "Wallet payment available" : "Choose a method when paying"}
                  </p>
                </div>
              </>
            ) : null}
            <div className={isOwnerActor ? "xl:px-4" : "sm:pr-4"}>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Total amount</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{formatUsdc(payoutTotalAmountState)} USDC</p>
            </div>
            <div className={isOwnerActor ? "xl:pl-4" : "sm:pl-4"}>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Payout status</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--foreground)]">
                <span className={`h-1.5 w-1.5 rounded-full ${payoutStatusTone}`} aria-hidden="true" />
                {payoutStatusLabel}
              </p>
            </div>
          </div>
          {payoutStatusState === "draft" && isOwnerActor ? (
            <div className="mt-4 flex flex-col gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">{canActivateDraft ? "Ready to activate" : "Complete these steps"}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{draftActivationMessage}</p>
                <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">1. Review payout details</p>
                    <p className={`mt-1 ${draftDetailsReady ? "text-emerald-700" : "text-amber-700"}`}>{draftDetailsReady ? "Ready" : "Save changes"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">2. Review milestones</p>
                    <p className={`mt-1 ${draftMilestonePlanReady ? "text-emerald-700" : "text-amber-700"}`}>{draftMilestonePlanReady ? "Ready" : "Save changes"}</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => { void activatePayout(); }}
                disabled={!canActivateDraft}
                className="w-full justify-center sm:w-auto"
              >
                {activatingPayout ? "Activating..." : "Activate payout"}
              </Button>
            </div>
          ) : effectivePayoutStatus !== "active" ? (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {effectivePayoutStatus === "partially_released"
                  ? "Some milestones have been paid. Continue reviewing approved milestones."
                  : isOwnerActor
                    ? "All milestones in this payout have been paid."
                    : "All milestones in this payout have been paid to you."}
            </p>
          ) : null}
        </section>

        {reviewError ? (
          <div role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-700 dark:text-rose-200">
            {reviewError}
          </div>
        ) : null}

        {payoutStatusState === "draft" && isOwnerActor ? (
          <>
            {draftSaveNotice ? (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-200">
                {draftSaveNotice}
              </div>
            ) : null}
            <Card className="sf-shell">
              <CardHeader>
                <div>
                  <CardTitle>Draft details</CardTitle>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Refine the payout title and description before activation so the agreement is ready for review and milestone work.
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Draft title
                      </label>
                      {draftTitleDirty ? <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700">Unsaved</span> : null}
                    </div>
                    <Input
                      aria-label="Draft payout title"
                      value={payoutTitleState}
                      onChange={(event) => setPayoutTitleState(event.target.value)}
                      placeholder="Refine the payout title"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Draft description
                      </label>
                      {draftDescriptionDirty ? <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700">Unsaved</span> : null}
                    </div>
                    <Textarea
                      aria-label="Draft payout description"
                      value={payoutDescriptionState}
                      onChange={(event) => setPayoutDescriptionState(event.target.value)}
                      placeholder="Add more context for this payout agreement"
                    />
                  </div>
                  <div className="border-t border-[var(--border-soft)] pt-4">
                    {draftTitleDirty || draftDescriptionDirty ? <p className="mb-3 text-sm text-amber-700">You have unsaved changes.</p> : null}
                    <Button
                      onClick={() => { void saveDraftDetails(); }}
                      disabled={savingDraftTitle || payoutTitleState.trim().length === 0 || (!draftTitleDirty && !draftDescriptionDirty)}
                      className="w-full justify-center sm:w-auto"
                    >
                      {savingDraftTitle ? "Saving..." : "Save draft details"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="sf-shell">
              <CardHeader>
                <div>
                  <CardTitle>Milestone plan</CardTitle>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Finalize milestone titles, scope, and amounts before this payout moves into active review and payment work.
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {draftMilestonesState.map((milestone, index) => (
                    <div key={milestone.id} className={`rounded-2xl border bg-[var(--surface)]/60 p-4 ${milestoneDirtyStates[index]?.title || milestoneDirtyStates[index]?.description || milestoneDirtyStates[index]?.amount ? "border-cyan-300/40" : "border-[var(--border-soft)]"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          Milestone {index + 1}
                        </p>
                        {milestoneDirtyStates[index]?.title || milestoneDirtyStates[index]?.description || milestoneDirtyStates[index]?.amount ? <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700">Unsaved</span> : null}
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
                        <div className="space-y-2">
                          <Input
                            aria-label={`Draft milestone ${index + 1} title`}
                            value={milestone.title}
                            onChange={(event) => setDraftMilestonesState((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))}
                            placeholder="Milestone title"
                          />
                          {milestoneDirtyStates[index]?.title ? <p className="text-xs text-amber-700">Unsaved title.</p> : null}
                        </div>
                        <div className="space-y-2">
                          <Input
                            aria-label={`Draft milestone ${index + 1} amount in USDC`}
                            value={milestone.amount}
                            onChange={(event) => setDraftMilestonesState((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))}
                            placeholder="Amount in USDC"
                          />
                          {milestoneAmountErrors[index] ? (
                            <p className="text-xs text-rose-200">{milestoneAmountErrors[index]}</p>
                          ) : milestoneDirtyStates[index]?.amount ? <p className="text-xs text-amber-700">Unsaved amount.</p> : null}
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <Textarea
                          aria-label={`Draft milestone ${index + 1} description`}
                          value={milestone.description}
                          onChange={(event) => setDraftMilestonesState((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))}
                          placeholder="Milestone description"
                        />
                        {milestoneDirtyStates[index]?.description ? <p className="text-xs text-amber-700">Unsaved description.</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
                  {draftMilestonesDirty ? <p className="mb-3 text-sm text-amber-700">You have unsaved milestone changes.</p> : null}
                  <Button onClick={() => { void saveDraftMilestones(); }} disabled={savingDraftTitle || !draftMilestonesDirty || hasMilestoneAmountError} className="w-full justify-center sm:w-auto">
                    {savingDraftTitle ? "Saving..." : "Save milestones"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        <section>
          <div className="mb-4 px-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Milestones</h2>
              {effectivePayoutStatus !== "draft" && milestones.length > 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {releasedCount} of {milestones.length} paid · {formatUsdc(amountReleased)} / {formatUsdc(payoutTotalAmountState)} USDC
                </p>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {isOwnerActor && submittedMilestoneCount > 0
                ? `${submittedMilestoneCount} milestone${submittedMilestoneCount === 1 ? "" : "s"} awaiting your review.`
                : "Track the work, review submissions, and see what unlocks payment next."}
            </p>
          </div>
          {activeHandoff ? (
            <div className="mb-5 flex flex-col gap-3 border-y border-[var(--border-soft)] px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {activeHandoff.label}
                </p>
                <p className="font-semibold text-[var(--foreground)]">{activeHandoff.title}</p>
                <p className="text-sm text-[var(--text-muted)]">{activeHandoff.description}</p>
              </div>
              {activeHandoff.action ? (
                "submitMilestoneId" in activeHandoff && activeHandoff.submitMilestoneId ? (
                  <Button
                    onClick={() => setSubmitRequestMilestoneId(activeHandoff.submitMilestoneId)}
                    size="sm"
                    className="w-full shrink-0 justify-center sm:w-auto sm:self-auto"
                  >
                    {activeHandoff.action}
                  </Button>
                ) : activeHandoff.href ? (
                  <Button href={activeHandoff.href} variant="secondary" size="sm" className="w-full shrink-0 justify-center sm:w-auto sm:self-auto">
                    {activeHandoff.action}
                  </Button>
                ) : null
              ) : null}
            </div>
          ) : null}
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <MilestoneRow
                key={`${milestone.id}:${milestone.status}`}
                milestone={milestone}
                paymentAttempt={paymentAttempts.find((payment) => payment.milestoneId === milestone.id && payment.status === "completed")}
                currentActor={currentActor}
                workspaceId={workspaceId}
                onApprove={canApproveMilestones ? () => handleApproveMilestone(milestone.id) : undefined}
                onReject={canApproveMilestones ? (_milestoneId, comment) => handleRejectMilestone(milestone.id, comment) : undefined}
                canStartPayment={isOwnerActor && nextReleasableMilestone?.id === milestone.id}
                onReviewPayment={() => setReleaseReviewRequest((current) => current + 1)}
                onStatusChange={handleMilestoneStatusChange}
                submitRequestMilestoneId={submitRequestMilestoneId}
                onSubmitRequestHandled={() => setSubmitRequestMilestoneId(null)}
                isPrimarySubmitAction={
                  activeHandoff !== null &&
                  "submitMilestoneId" in activeHandoff &&
                  activeHandoff.submitMilestoneId === milestone.id
                }
              />
            ))}
          </div>
        </section>

        <PayoutDetailReleaseShell
          payoutId={payout.id}
          recipientName={contributor?.name}
          recipientEmail={contributor?.email}
          recipientAddress={contributor?.walletAddress}
          nextReleasableMilestone={nextReleasableMilestone}
          releaseMilestoneTitle={latestReleasedMilestone?.title}
          releaseMilestoneAmount={latestReleasedMilestone?.amount}
          releaseProof={releaseProof}
          currentActor={currentActor}
          reviewRequest={releaseReviewRequest}
          onReleaseSuccess={handleReleaseSuccess}
          onSimulatedPaymentSuccess={handleSimulatedPaymentSuccess}
          onActivityChange={refreshActivity}
        />

        <details className="sf-activity-accordion px-1">
          <summary className="flex cursor-pointer list-none items-baseline gap-2 text-lg font-semibold tracking-tight text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
            <span>{isOwnerActor ? "Activity" : "Updates"}</span>
            <span className="ml-auto text-sm font-normal text-[var(--text-muted)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--foreground)]">
              <span className="sf-accordion-closed">View {isOwnerActor ? "activity" : "updates"} ({activityItems.length})</span>
              <span className="sf-accordion-open">Hide {isOwnerActor ? "activity" : "updates"}</span>
            </span>
          </summary>
          <div className="sf-accordion-content">
            <div className="sf-accordion-content-inner pt-5"><ActivityTimeline items={activityItems} /></div>
          </div>
        </details>

        {/* Export Receipt Modal */}
        <PayoutReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          payout={payout}
          contributor={contributor}
          milestones={milestones}
          releaseProof={releaseProof}
          paymentAttempts={paymentAttempts}
        />
      </div>
    </div>
  );
}
