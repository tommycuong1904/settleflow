"use client";

import { useState } from "react";

import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { ReviewControls } from "@/components/milestones/review-controls";
import { Button } from "@/components/shared/button";
import type { Milestone } from "@/lib/models/milestone";
import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";
import { formatUsdc } from "@/lib/utils/format";

type MilestoneRowProps = {
  milestone: Milestone;
  onApprove?: (milestoneId: string) => void | Promise<void>;
  onReject?: (milestoneId: string) => void | Promise<void>;
  onStatusChange?: (milestoneId: string, status: Milestone["status"]) => void;
};

export function MilestoneRow({
  milestone,
  onApprove,
  onReject,
  onStatusChange,
}: MilestoneRowProps) {
  const [status, setStatus] = useState(milestone.status);
  const [submitting, setSubmitting] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const isSubmitted = status === "submitted";
  const isApproved = status === "approved";
  const isReleased = status === "released";
  const isRejected = status === "rejected";
  const isSubmittable = status === "pending" || status === "rejected";

  async function handleSubmitMilestone() {
    if (!isSubmittable || submitting) return;

    setSubmissionError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/milestones/${milestone.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submittedByUserId: DEFAULT_PRODUCT_CONTEXT.contributorUserId,
          summary: `Submitted via SettleFlow payout detail for ${milestone.title}.`,
        }),
      });
      const data = (await response.json()) as { error?: string; milestone?: { status?: Milestone["status"] } };
      if (!response.ok) throw new Error(data.error ?? "Unable to submit milestone.");
      const nextStatus = data.milestone?.status ?? "submitted";
      setStatus(nextStatus);
      onStatusChange?.(milestone.id, nextStatus);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Unable to submit milestone.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!onApprove || reviewBusy) return;
    setReviewBusy(true);
    try {
      await onApprove(milestone.id);
      setStatus("approved");
      onStatusChange?.(milestone.id, "approved");
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleReject() {
    if (!onReject || reviewBusy) return;
    setReviewBusy(true);
    try {
      await onReject(milestone.id);
      setStatus("rejected");
      onStatusChange?.(milestone.id, "rejected");
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <div className="sf-shell rounded-3xl p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold text-white">{milestone.title}</p>
            <MilestoneStatusBadge status={status} />
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--text-primary)]">
            {milestone.description}
          </p>
          <p className="text-sm font-semibold text-cyan-100">
            {formatUsdc(milestone.amount)} USDC
          </p>
        </div>
        <div className="sf-panel min-w-[240px] rounded-3xl p-4 text-sm text-[var(--text-primary)]">
          {isSubmitted ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="font-semibold text-white">Review needed</p>
                <p>Submitted work is ready for an approve or reject decision.</p>
              </div>
              <ReviewControls
                submittedAt={milestone.submittedAt}
                onApprove={handleApprove}
                onReject={handleReject}
                busy={reviewBusy}
              />
            </div>
          ) : null}

          {isApproved ? (
            <div className="space-y-2">
              <p className="font-semibold text-white">Ready for release</p>
              <p>Approved work can now move to the Arc release step from the side panel.</p>
            </div>
          ) : null}

          {isReleased ? (
            <div className="space-y-2">
              <p className="font-semibold text-white">Released in USDC on Arc</p>
              <p>Settlement proof is now available in the side panel.</p>
              <p className="text-xs text-[var(--text-muted)]">
                Released {milestone.releasedAt ? milestone.releasedAt.slice(0, 10) : "recently"}
              </p>
            </div>
          ) : null}

          {isRejected ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="font-semibold text-white">Revision requested</p>
                <p>The contributor needs to resubmit this milestone before review can continue.</p>
              </div>
              <Button onClick={() => { void handleSubmitMilestone(); }} disabled={submitting} variant="secondary">
                {submitting ? "Submitting..." : "Resubmit milestone"}
              </Button>
            </div>
          ) : null}

          {!isSubmitted && !isApproved && !isReleased && !isRejected ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="font-semibold text-white">Waiting for contributor submission</p>
                <p>Review and release actions will unlock after work is submitted.</p>
              </div>
              <Button onClick={() => { void handleSubmitMilestone(); }} disabled={submitting} variant="secondary">
                {submitting ? "Submitting..." : "Submit milestone"}
              </Button>
            </div>
          ) : null}

          {submissionError ? (
            <p className="mt-3 text-xs text-rose-300">{submissionError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
