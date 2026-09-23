"use client";

import { useState } from "react";

import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { ReviewControls } from "@/components/milestones/review-controls";
import { SubmitMilestoneDialog } from "@/components/milestones/submit-milestone-dialog";
import { Button } from "@/components/shared/button";
import type { Milestone } from "@/lib/models/milestone";
import type { ProductActor } from "@/lib/runtime/product-context";
import { formatUsdc } from "@/lib/utils/format";
import {
  FileCode,
  ExternalLink,
  Clock,
  KeyRound,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { isRole } from "@/lib/runtime/role-utils";

type MilestoneRowProps = {
  milestone: Milestone;
  currentActor: ProductActor;
  workspaceId: string;
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
  workspaceId,
  onApprove,
  onReject,
  onStatusChange,
}: MilestoneRowProps) {
  const [status, setStatus] = useState(milestone.status);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Initialize from latestSubmission returned by backend getPayout
  const [lastSubmissionSummary, setLastSubmissionSummary] = useState<string | null>(
    milestone.latestSubmission?.summary || null,
  );
  const [lastArtifactUrl, setLastArtifactUrl] = useState<string | null>(
    milestone.latestSubmission?.artifactUrl || null,
  );
  const [lastArtifactLabel] = useState<string | null>(
    milestone.latestSubmission?.artifactLabel || null,
  );
  const [lastNotes] = useState<string | null>(
    milestone.latestSubmission?.notes || null,
  );

  const isSubmitted = status === "submitted";
  const isApproved = status === "approved";
  const isReleased = status === "released";
  const isRejected = status === "rejected";
  const isContributorActor = isRole(currentActor, "contributor");
  const isOwnerActor = isRole(currentActor, "owner");
  const canApproveMilestone = isOwnerActor;

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

  function handleOpenRejectDialog() {
    setRejectComment("");
    setSubmissionError(null);
    setIsRejectModalOpen(true);
  }

  async function handleConfirmReject() {
    if (!onReject || reviewBusy) return;
    if (!rejectComment.trim()) {
      setSubmissionError("A rejection comment is required.");
      return;
    }

    setReviewBusy(true);
    setSubmissionError(null);
    try {
      await onReject(milestone.id, rejectComment.trim());
      setStatus("rejected");
      setIsRejectModalOpen(false);
      onStatusChange?.(milestone.id, "rejected");
    } catch (err) {
      setSubmissionError(err instanceof Error ? err.message : "Failed to reject milestone.");
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <>
      <div
        className={`sf-shell rounded-2xl p-5 transition-all ${
          isSubmitted && canApproveMilestone
            ? "border-amber-500/35 bg-amber-500/[0.02] shadow-sm ring-1 ring-amber-500/10 dark:border-amber-500/30"
            : ""
        }`}
      >
        <div className="space-y-4">
          {/* Header Row: Title, Badges, Amount */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="font-semibold text-base text-[var(--foreground)] leading-snug">
                  {milestone.title}
                </p>
                <MilestoneStatusBadge status={status} />
                {isSubmitted && canApproveMilestone && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Clock size={11} /> Review Needed
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                {milestone.description}
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <span className="font-mono-numbers text-base font-bold text-[var(--foreground)] block">
                {formatUsdc(milestone.amount)} USDC
              </span>
            </div>
          </div>

          {/* Submitted deliverable review section */}
          {(lastArtifactUrl || lastSubmissionSummary || lastNotes) && (
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-xs space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-2.5">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-[var(--foreground)]">
                  <FileCode size={13} className="text-sky-500 dark:text-sky-400" />
                  <span>Submitted Deliverable Details</span>
                </div>
                {milestone.submittedAt && (
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {new Date(milestone.submittedAt).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Primary Deliverable Link */}
              {lastArtifactUrl && (
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">Proof Link:</span>
                  <a
                    href={lastArtifactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--foreground)] font-semibold text-xs hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all break-all"
                  >
                    <ExternalLink size={12} className="opacity-70 shrink-0" />
                    <span className="truncate max-w-md">{lastArtifactLabel || "View Primary Artifact"}</span>
                  </a>
                </div>
              )}

              {/* Submission Summary */}
              {lastSubmissionSummary && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Work Summary
                  </span>
                  <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-[var(--text-primary)] leading-relaxed whitespace-pre-line break-words text-xs">
                    {lastSubmissionSummary}
                  </div>
                </div>
              )}

              {/* Owner notes / credentials if provided */}
              {lastNotes && (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-amber-900 dark:text-amber-200">
                  <KeyRound size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold block text-[11px] mb-0.5">Owner Notes / Credentials:</span>
                    <p className="text-[11px] leading-relaxed select-all font-mono break-all">{lastNotes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action / Review Section */}
          {isSubmitted && canApproveMilestone ? (
            <ReviewControls
              submittedAt={milestone.submittedAt}
              onApprove={handleApprove}
              onReject={handleOpenRejectDialog}
              busy={reviewBusy}
            />
          ) : isSubmitted ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <Clock size={13} />
                <span>Submitted • Awaiting workspace owner review</span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                Only the workspace owner can approve or reject this milestone.
              </span>
            </div>
          ) : null}

          {isApproved ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 size={15} />
                <span>
                  {isOwnerActor ? "Ready for release" : "Waiting for owner release"}
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                {isOwnerActor
                  ? "Approved work can now move to the Arc release step from the side panel."
                  : "This milestone has been approved and is now waiting for the owner to release it on Arc."}
              </span>
            </div>
          ) : null}

          {isReleased ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-xs">
              <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold">
                <CheckCircle2 size={15} />
                <span>Released in USDC on Arc</span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                Released {milestone.releasedAt ? milestone.releasedAt.slice(0, 10) : "recently"} • Settlement proof in side panel
              </span>
            </div>
          ) : null}

          {isRejected ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle size={15} /> Revision requested
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  The contributor needs to resubmit this milestone before owner approval can continue.
                </p>
              </div>
              {isContributorActor ? (
                <Button onClick={() => setIsSubmitModalOpen(true)} variant="secondary" size="sm">
                  Resubmit milestone
                </Button>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Only the contributor can resubmit this milestone.</p>
              )}
            </div>
          ) : null}

          {!isSubmitted && !isApproved && !isReleased && !isRejected ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-[var(--border-soft)] text-xs">
              <div className="space-y-0.5">
                <p className="font-semibold text-[var(--foreground)]">Waiting for contributor submission</p>
                <p className="text-xs text-[var(--text-muted)]">Owner approval and release actions will unlock after work is submitted.</p>
              </div>
              {isContributorActor ? (
                <Button onClick={() => setIsSubmitModalOpen(true)} variant="secondary" size="sm">
                  Submit milestone
                </Button>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Only the contributor can submit this milestone.</p>
              )}
            </div>
          ) : null}

          {submissionError ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{submissionError}</p>
          ) : null}
        </div>
      </div>

      {/* Deliverable Submission Dialog */}
      <SubmitMilestoneDialog
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        milestone={milestone}
        workspaceId={workspaceId}
        onSuccess={handleSubmissionSuccess}
      />

      {/* Request Changes / Reject Dialog (Replaces window.prompt) */}
      {isRejectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsRejectModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 shadow-2xl text-[var(--foreground)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsRejectModalOpen(false)}
              disabled={reviewBusy}
              className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 text-rose-500 mb-2">
              <AlertTriangle size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Request changes</span>
            </div>

            <h3 className="text-lg font-bold text-[var(--foreground)]">
              Request changes to &quot;{milestone.title}&quot;
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Explain what needs to change before this milestone can be approved.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block uppercase tracking-wider font-semibold text-xs text-[var(--foreground)]">
                Feedback <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Describe the changes needed so the contributor can revise and resubmit."
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--input-background)] p-3 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-rose-500/50 focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all resize-none leading-relaxed"
              />
            </div>

            {submissionError && (
              <p className="mt-2 text-xs text-rose-500">{submissionError}</p>
            )}

            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-soft)]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={reviewBusy}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                disabled={reviewBusy || !rejectComment.trim()}
                icon={reviewBusy ? <Loader2 size={13} className="animate-spin" /> : undefined}
              >
                {reviewBusy ? "Submitting..." : "Send Revision Request"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
