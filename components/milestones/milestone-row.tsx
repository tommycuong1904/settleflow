"use client";

import { useEffect, useRef, useState } from "react";

import { MilestoneStatusBadge } from "@/components/milestones/milestone-status-badge";
import { ReviewControls } from "@/components/milestones/review-controls";
import { SubmitMilestoneDialog } from "@/components/milestones/submit-milestone-dialog";
import { Button } from "@/components/shared/button";
import type { Milestone } from "@/lib/models/milestone";
import type { PaymentAttempt } from "@/lib/models/payment-attempt";
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
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

type MilestoneRowProps = {
  milestone: Milestone;
  paymentAttempt?: PaymentAttempt;
  currentActor: ProductActor;
  workspaceId: string;
  onApprove?: (milestoneId: string) => void | Promise<void>;
  onReject?: (milestoneId: string, comment?: string) => void | Promise<void>;
  canStartPayment?: boolean;
  onReviewPayment?: () => void;
  onStatusChange?: (
    milestoneId: string,
    status: Milestone["status"],
    meta?: { submittedAt?: string; approvedAt?: string; rejectedAt?: string; releasedAt?: string },
  ) => void;
  submitRequestMilestoneId?: string | null;
  onSubmitRequestHandled?: () => void;
  isPrimarySubmitAction?: boolean;
};

export function MilestoneRow({
  milestone,
  paymentAttempt,
  currentActor,
  workspaceId,
  onApprove,
  onReject,
  canStartPayment = false,
  onReviewPayment,
  onStatusChange,
  submitRequestMilestoneId,
  onSubmitRequestHandled,
  isPrimarySubmitAction = false,
}: MilestoneRowProps) {
  const [status, setStatus] = useState(milestone.status);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const rejectCommentRef = useRef<HTMLTextAreaElement>(null);
  const rejectDialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isRejectModalOpen, rejectDialogRef);

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
  const isSimulatedPayment = paymentAttempt?.method === "simulated";

  useEffect(() => {
    if (
      submitRequestMilestoneId === milestone.id &&
      isContributorActor &&
      !isSubmitted &&
      !isApproved &&
      !isReleased
    ) {
      // The request originates outside this row. Defer the local UI transition
      // until after this render so React does not cascade state updates in an effect.
      const openDialog = window.setTimeout(() => {
        setIsSubmitModalOpen(true);
        onSubmitRequestHandled?.();
      }, 0);

      return () => window.clearTimeout(openDialog);
    }
  }, [
    isApproved,
    isContributorActor,
    isReleased,
    isSubmitted,
    milestone.id,
    onSubmitRequestHandled,
    submitRequestMilestoneId,
  ]);

  useEffect(() => {
    if (!isRejectModalOpen) return;

    const focusFrame = window.requestAnimationFrame(() => rejectCommentRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !reviewBusy) {
        event.preventDefault();
        setIsRejectModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRejectModalOpen, reviewBusy]);

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

  function closeRejectDialog() {
    if (!reviewBusy) setIsRejectModalOpen(false);
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
        id={`milestone-${milestone.id}`}
        className={`sf-shell scroll-mt-24 rounded-2xl p-4 md:p-5 transition-all ${
          isSubmitted && canApproveMilestone
            ? "border-amber-500/35 shadow-sm dark:border-amber-500/30"
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
                <MilestoneStatusBadge
                  status={status}
                  variant="text"
                  label={isContributorActor && status === "pending" ? "Ready for your work" : undefined}
                />
                {isSubmitted && canApproveMilestone && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
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
            <div className="border-t border-[var(--border-soft)] pt-4 text-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-[var(--foreground)]">
                  <FileCode size={13} className="text-sky-500 dark:text-sky-400" />
                  <span>Submitted Deliverable Details</span>
                </div>
                {milestone.submittedAt && (
                  <span
                    className="shrink-0 text-right text-[11px] leading-5 text-[var(--text-muted)]"
                    title={new Date(milestone.submittedAt).toLocaleString()}
                  >
                    {new Intl.DateTimeFormat(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(milestone.submittedAt))}
                  </span>
                )}
              </div>

              {/* Primary Deliverable Link */}
              {lastArtifactUrl && (
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">Work link:</span>
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
                  <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-line break-words text-sm">
                    {lastSubmissionSummary}
                  </p>
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
            <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[var(--border-soft)] pt-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={15} />
                  <span>
                    {isOwnerActor && canStartPayment ? "Ready to pay" : isOwnerActor ? "Payment queued" : "Waiting for payment"}
                  </span>
                </div>
                {isOwnerActor && canStartPayment ? (
                  <p className="text-[11px] font-normal text-[var(--text-muted)]">Choose how you want to record this payment.</p>
                ) : null}
              </div>
              {isOwnerActor && canStartPayment ? (
                <Button size="sm" onClick={onReviewPayment} className="w-full justify-center sm:w-auto">
                  Pay {formatUsdc(milestone.amount)} USDC
                </Button>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {isOwnerActor
                    ? "An earlier approved milestone must be paid first."
                    : "This milestone has been approved and is waiting for payment."}
                </span>
              )}
            </div>
          ) : null}

          {isReleased ? (
            <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 font-semibold text-sky-600 dark:text-sky-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>Payment complete</span>
                </span>
                {isSimulatedPayment ? (
                  <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-200">
                    Simulated · no funds moved
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                {isSimulatedPayment
                  ? `Paid ${milestone.releasedAt ? milestone.releasedAt.slice(0, 10) : "recently"}`
                  : `Paid ${milestone.releasedAt ? milestone.releasedAt.slice(0, 10) : "recently"} • Transaction details are available below`}
              </span>
            </div>
          ) : null}

          {isRejected ? (
            <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle size={15} /> Revision requested
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {isContributorActor
                    ? "Review the requested changes, then resubmit your work for approval."
                    : "The contributor needs to resubmit this milestone before owner approval can continue."}
                </p>
              </div>
              {isContributorActor && !isPrimarySubmitAction ? (
                <Button onClick={() => setIsSubmitModalOpen(true)} size="sm" className="w-full justify-center sm:w-auto">
                  Resubmit work
                </Button>
              ) : isContributorActor ? (
                <p className="text-xs text-[var(--text-muted)]">Use the next-step action above to resubmit your work.</p>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Only the contributor can resubmit this milestone.</p>
              )}
            </div>
          ) : null}

          {!isSubmitted && !isApproved && !isReleased && !isRejected ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-[var(--border-soft)] text-xs">
              <div className="space-y-0.5">
                <p className="font-semibold text-[var(--foreground)]">
                  {isContributorActor ? "Ready for your work" : "Waiting for contributor submission"}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {isContributorActor
                    ? "Submit your completed work for review."
                    : "Owner approval and payment become available after work is submitted."}
                </p>
              </div>
              {isContributorActor && !isPrimarySubmitAction ? (
                <Button onClick={() => setIsSubmitModalOpen(true)} size="sm" className="w-full justify-center sm:w-auto">
                  Submit work
                </Button>
              ) : isContributorActor ? (
                <p className="text-xs text-[var(--text-muted)]">Use the next-step action above to submit your work for review.</p>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md animate-in fade-in sm:p-4"
          onClick={closeRejectDialog}
        >
          <div
            ref={rejectDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-revision-title"
            tabIndex={-1}
            className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-2xl text-[var(--foreground)] sm:max-h-[calc(100dvh-2rem)] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeRejectDialog}
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

            <h3 id="request-revision-title" className="pr-8 text-lg font-bold text-[var(--foreground)]">
              Request changes to &quot;{milestone.title}&quot;
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Explain what needs to change before this milestone can be approved.
            </p>

            <div className="mt-4 space-y-2.5">
              <label htmlFor={`revision-feedback-${milestone.id}`} className="block uppercase tracking-wider font-semibold text-xs text-[var(--foreground)]">
                Feedback <span className="text-rose-500">*</span>
              </label>
              <textarea
                id={`revision-feedback-${milestone.id}`}
                ref={rejectCommentRef}
                required
                rows={3}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Describe the changes needed so the contributor can revise and resubmit."
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--input-background)] p-3 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-rose-500/50 focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all resize-none leading-relaxed"
              />
            </div>

            {submissionError && (
              <p role="alert" className="mt-2 text-xs text-rose-500">{submissionError}</p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[var(--border-soft)] pt-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={closeRejectDialog}
                disabled={reviewBusy}
                className="w-full justify-center sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                disabled={reviewBusy || !rejectComment.trim()}
                icon={reviewBusy ? <Loader2 size={13} className="animate-spin" /> : undefined}
                className="w-full justify-center sm:w-auto"
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
