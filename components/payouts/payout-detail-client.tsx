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
import type { ActivityItem } from "@/lib/models/activity-item";
import type { Contributor } from "@/lib/models/contributor";
import type { Milestone } from "@/lib/models/milestone";
import type { Payout } from "@/lib/models/payout";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
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
  initialActivity: ActivityItem[];
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
}: PayoutDetailClientProps) {
  const productContext = useResolvedProductContext();
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
  const [reviewingMilestoneId, setReviewingMilestoneId] = useState<string | null>(null);
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

  const nextActionText = nextReleasableMilestone
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
        body: JSON.stringify({
          workspaceId: productContext.workspaceId,
          activatedByUserId: productContext.ownerUserId,
        }),
      });
      const data = (await response.json()) as { error?: string; payout?: { status?: Payout["status"] } };
      if (!response.ok) throw new Error(data.error ?? "Unable to activate payout.");
      setPayoutStatusState(data.payout?.status ?? "active");
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
      body: JSON.stringify({
        workspaceId: productContext.workspaceId,
        ownerUserId: productContext.ownerUserId,
        ...fields,
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Unable to update payout draft.");
    await refreshActivity();
  }

  async function saveDraftTitle() {
    if (savingDraftTitle || payoutStatusState !== "draft") return;

    const nextTitle = payoutTitleState.trim();
    if (!nextTitle || nextTitle === payoutTitleCommitted) return;

    setReviewError(null);
    setDraftSaveNotice(null);
    setSavingDraftTitle(true);
    try {
      await saveDraftFields({ title: nextTitle });
      setPayoutTitleCommitted(nextTitle);
      setPayoutTitleState(nextTitle);
      setDraftSaveNotice("Draft title saved.");
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
      await saveDraftFields({ description: nextDescription });
      setPayoutDescriptionCommitted(nextDescription);
      setPayoutDescriptionState(nextDescription);
      setDraftSaveNotice("Draft description saved.");
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
      await saveDraftFields({ milestones: normalized });
      setDraftMilestonesCommitted(draftMilestonesState);
      setDraftSaveNotice("Draft milestones saved.");
      setMilestoneState((current) =>
        current.map((milestone, index) => ({
          ...milestone,
          title: draftMilestonesState[index]?.title.trim() || milestone.title,
          description: draftMilestonesState[index]?.description.trim() || milestone.description,
          amount: Number(draftMilestonesState[index]?.amount ?? milestone.amount),
        })),
      );
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Unable to update payout draft.");
      setDraftMilestonesState(draftMilestonesCommitted);
    } finally {
      setSavingDraftTitle(false);
    }
  }

  function handleMilestoneStatusChange(milestoneId: string, status: Milestone["status"]) {
    setMilestoneState((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              status,
              submittedAt: status === "submitted" ? new Date().toISOString() : milestone.submittedAt,
            }
          : milestone,
      ),
    );
  }

  async function reviewMilestone(milestoneId: string, decision: "approved" | "rejected") {
    setReviewError(null);
    setReviewingMilestoneId(milestoneId);
    try {
      const response = await fetch(`/api/v1/milestones/${milestoneId}/${decision === "approved" ? "approve" : "reject"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewedByUserId: productContext.reviewerUserId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? `Unable to ${decision} milestone.`);
      setMilestoneState((current) => current.map((milestone) =>
        milestone.id === milestoneId
          ? { ...milestone, status: decision, ...(decision === "approved" ? { approvedAt: new Date().toISOString() } : {}) }
          : milestone,
      ));
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Review request failed.");
    } finally {
      setReviewingMilestoneId(null);
    }
  }

  function handleApproveMilestone(milestoneId: string) {
    return reviewMilestone(milestoneId, "approved");
  }

  function handleRejectMilestone(milestoneId: string) {
    return reviewMilestone(milestoneId, "rejected");
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
  }

  return (
    <div className="flex flex-col gap-8">
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

      <Card className="sf-shell">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Payout Summary</CardTitle>
          {payoutStatusState === "draft" ? (
            <Button onClick={() => { void activatePayout(); }} disabled={activatingPayout}>
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
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            {effectivePayoutStatus === "draft"
              ? "This payout is still a draft. Activate it to begin milestone submissions and reviews."
              : effectivePayoutStatus === "active"
                ? "This payout is active. Contributors can submit milestones and reviewers can approve or reject work."
                : effectivePayoutStatus === "partially_released"
                  ? "This payout has partial settlement progress. Continue reviewing and releasing approved milestones."
                  : "This payout is fully settled and all milestone releases are complete."}
          </p>
        </CardContent>
      </Card>

      {payoutStatusState === "draft" ? (
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
                <CardTitle>Draft editing harness</CardTitle>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Lightweight draft update flow to exercise the real PATCH path and audit logging.
                </p>
              </div>
              <Button
                onClick={() => { void saveDraftTitle(); }}
                disabled={savingDraftTitle || payoutTitleState.trim().length === 0 || !draftTitleDirty}
              >
                {savingDraftTitle ? "Saving..." : "Save draft title"}
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
                <CardTitle>Milestone draft harness</CardTitle>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Refine milestone copy and amounts through the real payout draft PATCH path.
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
                  onApprove={handleApproveMilestone}
                  onReject={handleRejectMilestone}
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
          releaseProof={releaseProof}
          onReleaseSuccess={handleReleaseSuccess}
        />
      </div>

      <ActivityTimeline items={activityItems} />
    </div>
  );
}
