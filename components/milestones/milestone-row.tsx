"use client";

import { useState } from "react";

import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { ReviewControls } from "@/components/milestones/review-controls";
import { SubmitMilestoneDialog } from "@/components/milestones/submit-milestone-dialog";
import { Button } from "@/components/shared/button";
import type { Milestone } from "@/lib/models/milestone";
import type { ProductActor } from "@/lib/runtime/product-context";
import { formatUsdc } from "@/lib/utils/format";
import { FileCode, ExternalLink } from "lucide-react";
import { hasRole, isRole } from "@/lib/runtime/role-utils";

type MilestoneRowProps = {
  milestone: Milestone;
  currentActor: ProductActor;
  onApprove?: (milestoneId: string) => void | Promise<void>;
  onReject?: (milestoneId: string, comment?: string) => void | Promise<void>;
  onStatusChange?: (
    milestoneId: string,
    status: Milestone["status"],
    meta?: { submittedAt?: string; approvedAt?: string; rejectedAt?: string; releasedAt?: string },
  ) => void;
};

export function MilestoneRow({
  milestone,
  currentActor,
  onApprove,
  onReject,
  onStatusChange,
}: MilestoneRowProps) {
  const [status, setStatus] = useState(milestone.status);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [lastSubmissionSummary, setLastSubmissionSummary] = useState<string | null>(null);
  const [lastArtifactUrl, setLastArtifactUrl] = useState<string | null>(null);

  const isSubmitted = status === "submitted";
  const isApproved = status === "approved";
  const isReleased = status === "released";
  const isRejected = status === "rejected";
  const isContributorActor = isRole(currentActor, "contributor");
  const isReviewerActor = isRole(currentActor, "reviewer");
  const isOwnerActor = isRole(currentActor, "owner");
  const isSubmittable = (status === "pending" || status === "rejected") && isContributorActor;

  const handleSubmissionSuccess = (meta?: { submittedAt?: string; summary?: string; artifactUrl?: string }) => {
    setStatus("submitted");
    if (meta?.summary) setLastSubmissionSummary(meta.summary);
    if (meta?.artifactUrl) setLastArtifactUrl(meta.artifactUrl);
    onStatusChange?.(milestone.id, "submitted", { submittedAt: meta?.submittedAt });
  };

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
    const comment = window.prompt(
      `Why is ${milestone.title} being rejected?`,
      "Please revise and resubmit with the requested changes.",
    );
    if (comment === null) return;
    if (comment.trim().length === 0) {
      setSubmissionError("A rejection comment is required.");
      return;
    }

    setReviewBusy(true);
    setSubmissionError(null);
    try {
      await onReject(milestone.id, comment.trim());
      setStatus("rejected");
      onStatusChange?.(milestone.id, "rejected");
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <>
      <div className="sf-shell rounded-xl p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-semibold text-[var(--foreground)]">{milestone.title}</p>
              <MilestoneStatusBadge status={status} />
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[var(--text-primary)]">
              {milestone.description}
            </p>
            <p className="font-mono-numbers text-sm font-medium text-[var(--foreground)]">
              {formatUsdc(milestone.amount)} USDC
            </p>

            {/* Submitted deliverable link preview */}
            {(lastArtifactUrl || lastSubmissionSummary) && (
              <div className="mt-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3 text-xs space-y-1.5 max-w-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Attached Deliverable
                </p>
                {lastSubmissionSummary && (
                  <p className="text-[var(--text-primary)] leading-relaxed italic">
                    &quot;{lastSubmissionSummary}&quot;
                  </p>
                )}
                {lastArtifactUrl && (
                  <a
                    href={lastArtifactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sky-500 hover:underline font-medium underline-offset-2 transition-colors pt-0.5"
                  >
                    <FileCode size={13} /> View Submitted Artifact <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="sf-panel w-full md:w-auto md:min-w-[240px] rounded-3xl p-4 text-sm text-[var(--text-primary)]">
            {isSubmitted ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--foreground)]">Review needed</p>
                  <p>Submitted work is ready for an approve or reject decision.</p>
                </div>
                {hasRole(currentActor, 'reviewer') ? (
                  <ReviewControls
                    submittedAt={milestone.submittedAt}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    busy={reviewBusy}
                  />
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Only the reviewer can approve or reject this milestone.</p>
                )}
              </div>
            ) : null}

            {isApproved ? (
              <div className="space-y-2">
                <p className="font-semibold text-[var(--foreground)]">
                  {isOwnerActor ? "Ready for release" : isReviewerActor ? "Review complete" : "Waiting for release"}
                </p>
                <p>
                  {isOwnerActor
                    ? "Approved work can now move to the Arc release step from the side panel."
                    : isReviewerActor
                      ? "Your review is complete. The owner can now release this approved milestone on Arc."
                      : "This milestone has been approved and is now waiting for the owner to release it on Arc."}
                </p>
              </div>
            ) : null}

            {isReleased ? (
              <div className="space-y-2">
                <p className="font-semibold text-[var(--foreground)]">Released in USDC on Arc</p>
                <p>Settlement proof is now available in the side panel.</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Released {milestone.releasedAt ? milestone.releasedAt.slice(0, 10) : "recently"}
                </p>
              </div>
            ) : null}

            {isRejected ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="font-semibold text-[var(--foreground)]">Revision requested</p>
                  <p>The contributor needs to resubmit this milestone before review can continue.</p>
                </div>
                {isContributorActor ? (
                  <Button onClick={() => setIsSubmitModalOpen(true)} variant="secondary">
                    Resubmit milestone
                  </Button>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Only the contributor can resubmit this milestone.</p>
                )}
              </div>
            ) : null}

            {!isSubmitted && !isApproved && !isReleased && !isRejected ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="font-semibold text-[var(--foreground)]">Waiting for contributor submission</p>
                  <p>Review and release actions will unlock after work is submitted.</p>
                </div>
                {isContributorActor ? (
                  <Button onClick={() => setIsSubmitModalOpen(true)} variant="secondary">
                    Submit milestone
                  </Button>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Only the contributor can submit this milestone.</p>
                )}
              </div>
            ) : null}

            {submissionError ? (
              <p className="mt-3 text-xs text-rose-600 dark:text-rose-300">{submissionError}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Deliverable Submission Dialog */}
      <SubmitMilestoneDialog
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        milestone={milestone}
        onSuccess={handleSubmissionSuccess}
      />
    </>
  );
}
