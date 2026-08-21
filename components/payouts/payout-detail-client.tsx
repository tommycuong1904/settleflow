/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";

import { ActivityTimeline } from "@/components/payouts/activity-timeline";
import { StatCard } from "@/components/dashboard/stat-card";
import { MilestoneRow } from "@/components/milestones/milestone-row";
import { PayoutDetailReleaseShell } from "@/components/payouts/payout-detail-release-shell";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/context/toast-context";
import type { ActivityItem } from "@/lib/models/activity-item";
import type { Contributor } from "@/lib/models/contributor";
import type { Milestone } from "@/lib/models/milestone";
import type { Payout } from "@/lib/models/payout";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import type { ProductActor } from "@/lib/runtime/product-context";
import { PayoutReceiptModal } from "@/components/payouts/payout-receipt-modal";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";
import { Crown, Search, Code2, FileCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { hasRole, isRole } from "@/lib/runtime/role-utils";

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
  initialActivity: ActivityItem[];
  currentActor: ProductActor;
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
  return null;
}

export function PayoutDetailClient({
  payout,
  contributor,
  initialMilestones,
  initialReleaseProof,
  initialActivity,
  currentActor,
}: PayoutDetailClientProps) {
  const isOwnerActor = isRole(currentActor, "owner");
  const isReviewerActor = isRole(currentActor, "reviewer");
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
  const [payoutTotalAmountState, setPayoutTotalAmountState] = useState(payout.totalAmount);
  const [payoutTitleCommitted, setPayoutTitleCommitted] = useState(payout.title);
const [reviewingMilestoneId, setReviewingMilestoneId] = useState<string | null>(null);

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
  const { toast } = useToast();

  const [activatingPayout, setActivatingPayout] = useState(false);
  const [savingDraftTitle, setSavingDraftTitle] = useState(false);

  useEffect(() => {
    if (!initialReleaseProof || !persistedRelease) {
      return;
    }

    if (persistedRelease.proof.id === initialReleaseProof.id) {
      return;
    }

    setPersistedRelease(null);
    window.sessionStorage.removeItem(getStorageKey(payout.id));
  }, [initialReleaseProof, payout.id, persistedRelease]);

  useEffect(() => {
    setMilestoneState(initialMilestones);
    setPayoutStatusState(payout.status);
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
    setReviewingMilestoneId(null);
    setActivatingPayout(false);
    setSavingDraftTitle(false);
  }, [initialActivity, initialMilestones, payout.description, payout.status, payout.title, payout.totalAmount]);

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

  const releaseProof = initialReleaseProof ?? persistedRelease?.proof;

  const latestReleasedMilestone = releaseProof
    ? milestones.find((milestone) => milestone.id === releaseProof.milestoneId)
    : milestones.findLast((milestone) => milestone.status === "released");

  const nextReleasableMilestone = milestones.find(
    (milestone) => milestone.status === "approved",
  );
  const currentReleasableMilestoneId = nextReleasableMilestone?.id;
  const releasePendingForCurrentMilestone =
    releaseProof?.status === "pending" &&
    Boolean(currentReleasableMilestoneId) &&
    releaseProof.milestoneId === currentReleasableMilestoneId;
  const releaseFailedForCurrentMilestone =
    releaseProof?.status === "failed" &&
    Boolean(currentReleasableMilestoneId) &&
    releaseProof.milestoneId === currentReleasableMilestoneId;

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

  const effectivePayoutStatus =
    releasedCount === milestones.length && milestones.length > 0
      ? "completed"
      : releasedCount > 0
        ? "partially_released"
        : payoutStatusState;

  const payoutStatusLabel =
    effectivePayoutStatus === "partially_released"
      ? "Partially released"
      : effectivePayoutStatus === "active"
        ? amountReleased > 0
          ? "Partially released"
          : "In progress"
        : effectivePayoutStatus.replace("_", " ");

  const nextActionText = releasePendingForCurrentMilestone
    ? `Settlement proof for ${nextReleasableMilestone?.title ?? "the approved milestone"} is still pending. Confirm or fail the proof update before queuing another release.`
    : releaseFailedForCurrentMilestone
      ? `Settlement proof for ${nextReleasableMilestone?.title ?? "the approved milestone"} failed. Retry the release or refresh the proof status before moving on.`
      : nextReleasableMilestone
        ? `Release ${nextReleasableMilestone.title} to continue settlement.`
        : submittedCount > 0
          ? "Review submitted milestones to unlock the next release."
          : milestones.some((milestone) => milestone.status === "pending" || milestone.status === "rejected")
            ? "Ask the contributor to submit the next milestone deliverable."
            : effectivePayoutStatus === "completed"
              ? "This payout is fully settled. Review the proof record or open another payout."
              : "No immediate action is available yet on this payout.";

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

  async function activatePayout() {
    if (activatingPayout || payoutStatusState !== "draft") return;

    setReviewError(null);
    setActivatingPayout(true);
    try {
      const response = await fetch(`/api/v1/payouts/${payout.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as { error?: string; payout?: { status?: Payout["status"] } };
      setPayoutStatusState(data.payout?.status ?? "active");
      toast({
        variant: "success",
        title: "Payout Activated",
        description: "Draft is now active. Milestones can be submitted.",
      });
      await refreshActivity();
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Unable to activate payout.");
    } finally {
      setActivatingPayout(false);
    }
  }

  async function refreshActivity() {
    const response = await fetch(`/api/v1/payouts/${payout.id}/activity`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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

  async function saveDraftTitle() {
    if (savingDraftTitle || payoutStatusState !== "draft") return;

    const nextTitle = payoutTitleState.trim();
    if (!nextTitle || nextTitle === payoutTitleCommitted) return;

    setReviewError(null);
    setDraftSaveNotice(null);
    setSavingDraftTitle(true);
    try {
      const updated = await saveDraftFields({ title: nextTitle });
      const resolvedTitle = updated?.title ?? nextTitle;
      const resolvedDescription = updated?.description ?? payoutDescriptionState;
      setPayoutTitleCommitted(resolvedTitle);
      setPayoutTitleState(resolvedTitle);
      setPayoutDescriptionCommitted(resolvedDescription);
      setPayoutDescriptionState(resolvedDescription);
      setDraftSaveNotice("Draft title saved.");
      toast({
        variant: "info",
        title: "Draft Saved",
        description: "Payout title has been updated.",
        durationMs: 2500,
      });
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Unable to update payout draft.");
      setPayoutTitleState(payoutTitleCommitted);
    } finally {
      setSavingDraftTitle(false);
    }
  }

  async function saveDraftDescription() {
    if (savingDraftTitle || payoutStatusState !== "draft") return;

    const nextDescription = payoutDescriptionState.trim();
    if (nextDescription === payoutDescriptionCommitted) return;

    setReviewError(null);
    setDraftSaveNotice(null);
    setSavingDraftTitle(true);
    try {
      const updated = await saveDraftFields({ description: nextDescription });
      const resolvedTitle = updated?.title ?? payoutTitleState;
      const resolvedDescription = updated?.description ?? nextDescription;
      setPayoutTitleCommitted(resolvedTitle);
      setPayoutTitleState(resolvedTitle);
      setPayoutDescriptionCommitted(resolvedDescription);
      setPayoutDescriptionState(resolvedDescription);
      setPayoutTotalAmountState(Number(updated?.totalAmountUsdc ?? payoutTotalAmountState));
      setDraftSaveNotice("Draft description saved.");
      toast({
        variant: "info",
        title: "Draft Saved",
        description: "Payout description has been updated.",
        durationMs: 2500,
      });
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Unable to update payout draft.");
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
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Unable to update payout draft.");
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
    void refreshActivity();
  }

  async function reviewMilestone(milestoneId: string, decision: "approved" | "rejected", comment?: string) {
    setReviewError(null);
    setReviewingMilestoneId(milestoneId);
    try {
      const response = await fetch(`/api/v1/milestones/${milestoneId}/${decision === "approved" ? "approve" : "reject"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          ? "Deliverable accepted. Ready for USDC release." 
          : "Revisions requested. Contributor notified.",
      });
      await refreshActivity();
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Review request failed.");
    } finally {
      setReviewingMilestoneId(null);
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
      title: "USDC Released on Arc",
      description: "Milestone funds settled onchain. Tx proof recorded.",
    });
    void refreshActivity();
  }

  return (
    <div className="sf-container flex flex-col py-10 md:py-12">
      <div className="flex flex-col gap-8">
        {/* Role Simulation Context Banner */}
        <div
          className={`rounded-2xl border p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              hasRole(currentActor, "owner")
                ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                : hasRole(currentActor, "reviewer")
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
            }`}
        >
          <div className="flex items-center gap-2.5">
            {hasRole(currentActor, "owner") ? (
                <Crown size={18} className="text-amber-400 shrink-0" />
              ) : hasRole(currentActor, "reviewer") ? (
                <Search size={18} className="text-cyan-400 shrink-0" />
              ) : (
                <Code2 size={18} className="text-emerald-400 shrink-0" />
              )}
            <p className="leading-relaxed">
              Viewing as <strong className="font-semibold uppercase tracking-wider">{currentActor}</strong>:{" "}
               {hasRole(currentActor, "owner")
                 ? "You have full control to activate draft agreements, refine milestone allocations, and trigger Arc USDC releases."
                 : hasRole(currentActor, "reviewer")
                 ? "Your primary role is to inspect milestone deliverables and approve or reject submissions to authorize payout release."
                 : "You can submit milestone deliverables for review and track your upcoming USDC escrow settlements."}
            </p>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider opacity-70 shrink-0">
            Use Header to switch role
          </span>
        </div>

        {/* Header with Export Receipt CTA */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
              Payout detail
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {payoutTitleState}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-[var(--text-primary)] md:text-base">
                {payoutDescriptionState.trim().length > 0
                  ? payoutDescriptionState
                  : "Review milestone submissions, approve release in sequence, and keep Arc settlement proof attached to the payout flow."}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsReceiptModalOpen(true)}
              icon={<FileCheck size={15} className="text-cyan-400" />}
            >
              Export Settlement Receipt
            </Button>
          </div>
        </div>

        <Card className="sf-shell">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Payout Summary</CardTitle>
            {payoutStatusState === "draft" && hasRole(currentActor, "owner") ? (
              <Button
                onClick={() => { void activatePayout(); }}
                disabled={activatingPayout || hasUnsavedDraftChanges || hasMilestoneAmountError || payoutTitleState.trim().length === 0}
              >
                {activatingPayout ? "Activating..." : "Activate payout"}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Contributor", value: contributor?.name ?? payout.contributorId },
                {
                  label: "Wallet",
                  value: contributor ? shortenAddress(contributor.walletAddress) : "Unknown",
                },
                { label: "Total amount", value: `${formatUsdc(payoutTotalAmountState)} USDC` },
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
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              {effectivePayoutStatus === "draft"
                ? hasUnsavedDraftChanges
                  ? "This payout is still a draft. Save your draft changes before activating milestone submissions and reviews."
                  : "This payout is still a draft. Activate it to begin milestone submissions and reviews."
                : effectivePayoutStatus === "active"
                  ? "This payout is active. Contributors can submit milestones and reviewers can approve or reject work."
                  : effectivePayoutStatus === "partially_released"
                    ? "This payout has partial settlement progress. Continue reviewing and releasing approved milestones."
                    : "This payout is fully settled and all milestone releases are complete."}
            </p>
          </CardContent>
        </Card>

        {payoutStatusState === "draft" && isOwnerActor ? (
          <>
            {reviewError ? (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {reviewError}
              </div>
            ) : null}
            {draftSaveNotice ? (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {draftSaveNotice}
              </div>
            ) : null}
            <Card className="sf-shell">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Draft details</CardTitle>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Refine the payout title and description before activation so the agreement is ready for review and milestone work.
                  </p>
                </div>
                <Button
                  onClick={() => { void saveDraftTitle(); }}
                  disabled={savingDraftTitle || payoutTitleState.trim().length === 0 || !draftTitleDirty}
                >
                  {savingDraftTitle ? "Saving..." : "Save payout details"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Draft title
                      </label>
                      {draftTitleDirty ? <span className="text-[11px] uppercase tracking-[0.16em] text-cyan-200">Changed</span> : null}
                    </div>
                    <Input
                      value={payoutTitleState}
                      onChange={(event) => setPayoutTitleState(event.target.value)}
                      placeholder="Refine the payout title"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Draft description
                      </label>
                      {draftDescriptionDirty ? <span className="text-[11px] uppercase tracking-[0.16em] text-cyan-200">Changed</span> : null}
                      <Button
                        variant="secondary"
                        onClick={() => { void saveDraftDescription(); }}
                        disabled={savingDraftTitle || !draftDescriptionDirty}
                      >
                        Save description
                      </Button>
                    </div>
                    <Textarea
                      value={payoutDescriptionState}
                      onChange={(event) => setPayoutDescriptionState(event.target.value)}
                      placeholder="Add more context for this payout agreement"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="sf-shell">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Milestone plan</CardTitle>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Finalize milestone titles, scope, and amounts before this payout moves into active review and release work.
                  </p>
                </div>
                <Button onClick={() => { void saveDraftMilestones(); }} disabled={savingDraftTitle || !draftMilestonesDirty || hasMilestoneAmountError}>
                  {savingDraftTitle ? "Saving..." : "Save milestones"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {draftMilestonesState.map((milestone, index) => (
                    <div key={milestone.id} className={`rounded-2xl border bg-[rgba(15,23,42,0.62)] p-4 ${milestoneDirtyStates[index]?.title || milestoneDirtyStates[index]?.description || milestoneDirtyStates[index]?.amount ? "border-cyan-300/40" : "border-[var(--border-soft)]"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          Milestone {index + 1}
                        </p>
                        {milestoneDirtyStates[index]?.title || milestoneDirtyStates[index]?.description || milestoneDirtyStates[index]?.amount ? <span className="text-[11px] uppercase tracking-[0.16em] text-cyan-200">Changed</span> : null}
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
                        <div className="space-y-2">
                          <Input
                            value={milestone.title}
                            onChange={(event) => setDraftMilestonesState((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))}
                            placeholder="Milestone title"
                          />
                          {milestoneDirtyStates[index]?.title ? <p className="text-xs text-cyan-200">Title changed.</p> : null}
                        </div>
                        <div className="space-y-2">
                          <Input
                            value={milestone.amount}
                            onChange={(event) => setDraftMilestonesState((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))}
                            placeholder="Amount in USDC"
                          />
                          {milestoneAmountErrors[index] ? (
                            <p className="text-xs text-rose-200">{milestoneAmountErrors[index]}</p>
                          ) : milestoneDirtyStates[index]?.amount ? <p className="text-xs text-cyan-200">Amount changed.</p> : null}
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={milestone.description}
                          onChange={(event) => setDraftMilestonesState((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))}
                          placeholder="Milestone description"
                        />
                        {milestoneDirtyStates[index]?.description ? <p className="text-xs text-cyan-200">Description changed.</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
          </div>
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
            <span className="font-semibold text-white">Next action:</span> {nextActionText}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="sf-shell">
            <CardHeader>
              <CardTitle>Milestone Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestones.map((milestone) => (
                  <MilestoneRow
                    key={milestone.id}
                    milestone={milestone}
                    currentActor={currentActor}
                    onApprove={isReviewerActor ? () => handleApproveMilestone(milestone.id) : undefined}
                    onReject={isReviewerActor ? (_milestoneId, comment) => handleRejectMilestone(milestone.id, comment) : undefined}
                    onStatusChange={handleMilestoneStatusChange}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <PayoutDetailReleaseShell
            payoutId={payout.id}
            recipientAddress={contributor?.walletAddress}
            nextReleasableMilestone={nextReleasableMilestone}
            releaseMilestoneTitle={latestReleasedMilestone?.title}
            releaseProof={releaseProof}
            currentActor={currentActor}
            onReleaseSuccess={handleReleaseSuccess}
            onActivityChange={refreshActivity}
          />
        </div>

        <ActivityTimeline items={activityItems} />

        {/* Export Receipt Modal */}
        <PayoutReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          payout={payout}
          contributor={contributor}
          milestones={milestones}
          releaseProof={releaseProof}
        />
      </div>
    </div>
  );
}
