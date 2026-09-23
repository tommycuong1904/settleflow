"use client";

import React, { useState } from "react";
import { Button } from "@/components/shared/button";
import {
  X,
  Send,
  Link as LinkIcon,
  Loader2,
  Code2,
  Video,
  Layers,
  Globe,
  FileText,
  ChevronDown,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";
import { formatUsdc } from "@/lib/utils/format";
import type { Milestone } from "@/lib/models/milestone";
import { useWallet } from "@/lib/context/wallet-context";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { PRODUCT_CONTEXT_HEADER_NAMES } from "@/lib/runtime/product-context";

type SubmitMilestoneDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  milestone: Milestone;
  workspaceId: string;
  onSuccess: (submissionMeta?: { submittedAt?: string; summary?: string; artifactUrl?: string }) => void;
};

type LabelOption = {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const SUGGESTED_LABELS: LabelOption[] = [
  { label: "GitHub Pull Request", icon: Code2 },
  { label: "Figma Design Specs", icon: Layers },
  { label: "Walkthrough Video", icon: Video },
  { label: "Documentation", icon: FileText },
  { label: "Live Staging / Demo", icon: Globe },
];

function detectLabelFromUrl(url: string): string {
  const u = url.toLowerCase().trim();
  if (!u) return "Deliverable";
  if (u.includes("github.com") || u.includes("gitlab.com")) return "GitHub Pull Request";
  if (u.includes("figma.com")) return "Figma Design Specs";
  if (u.includes("loom.com") || u.includes("youtube.com") || u.includes("vimeo.com")) return "Walkthrough Video";
  if (u.includes("docs.google.com") || u.includes("notion.so") || u.includes("notion.site")) return "Documentation";
  return "Live Staging / Demo";
}

function getLabelIcon(label: string) {
  return SUGGESTED_LABELS.find((l) => l.label === label)?.icon || Globe;
}

export function SubmitMilestoneDialog({
  isOpen,
  onClose,
  milestone,
  workspaceId,
  onSuccess,
}: SubmitMilestoneDialogProps) {
  const [proofs, setProofs] = useState<string[]>([""]);
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [showExtraNotes, setShowExtraNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useScrollLock(isOpen);
  const { address: connectedAddress } = useWallet();

  if (!isOpen) return null;

  const handleProofChange = (index: number, val: string) => {
    setProofs((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleAddProof = () => {
    if (proofs.length < 5) {
      setProofs((prev) => [...prev, ""]);
    }
  };

  const handleRemoveProof = (index: number) => {
    setProofs((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleFillTemplate = () => {
    setSummary(
      `Completed deliverable for "${milestone.title}". All acceptance criteria have been implemented, tested, and verified.`,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSummary = summary.trim();

    if (!trimmedSummary) {
      setError("Please provide a summary of your completed work.");
      return;
    }

    const validProofs = proofs.map((p) => p.trim()).filter(Boolean);
    const primaryUrl = validProofs[0] || undefined;
    const primaryLabel = primaryUrl ? detectLabelFromUrl(primaryUrl) : undefined;

    // If multiple proofs are attached, append them nicely formatted to the summary
    let finalSummary = trimmedSummary;
    if (validProofs.length > 1) {
      const linksBlock = validProofs
        .map((url) => `• ${detectLabelFromUrl(url)}: ${url}`)
        .join("\n");
      finalSummary = `${trimmedSummary}\n\nAttached Deliverables:\n${linksBlock}`;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/v1/milestones/${milestone.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [PRODUCT_CONTEXT_HEADER_NAMES.workspaceId]: workspaceId,
        },
        body: JSON.stringify({
          summary: finalSummary,
          artifactUrl: primaryUrl,
          artifactLabel: primaryLabel,
          notes: notes.trim() || undefined,
          walletAddress: connectedAddress || undefined,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        milestone?: { status?: Milestone["status"] };
        submission?: { submittedAt?: string };
      };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to submit milestone.");
      }

      onSuccess({
        submittedAt: data.submission?.submittedAt,
        summary: finalSummary,
        artifactUrl: primaryUrl,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit milestone.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-7 shadow-2xl text-[var(--foreground)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-5 pr-8">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">
            Submit for review
          </span>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--foreground)] mt-1 line-clamp-1">
            {milestone.title}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>
              Reward:{" "}
              <strong className="text-[var(--foreground)] font-mono font-semibold">
                {formatUsdc(milestone.amount)} USDC
              </strong>
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Payment is released after approval</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200 animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block uppercase tracking-wider font-semibold text-[var(--foreground)]">
                Reference links <span className="normal-case font-normal text-[var(--text-muted)]">(optional)</span>
              </label>
            </div>

            <div className="space-y-2">
              {proofs.map((proofUrl, index) => {
                const detectedLabel = proofUrl.trim() ? detectLabelFromUrl(proofUrl) : null;
                const DetectedIcon = detectedLabel ? getLabelIcon(detectedLabel) : null;

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <LinkIcon
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                        />
                        <input
                          type="url"
                          value={proofUrl}
                          onChange={(e) => handleProofChange(index, e.target.value)}
                          placeholder={
                            index === 0
                              ? "https://github.com/org/repo/pull/123"
                              : "Add another link"
                          }
                          className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-9 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-strong)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all font-mono"
                        />
                      </div>

                      {proofs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProof(index)}
                          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove this link"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {detectedLabel && DetectedIcon && (
                      <div className="pl-1 pt-0.5 flex items-center gap-1.5 animate-in fade-in duration-150">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-[10px] font-semibold">
                          <DetectedIcon size={11} />
                          {detectedLabel}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {index === 0 ? "(Primary artifact)" : "(Attached artifact)"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {proofs.length < 5 && (
              <button
                type="button"
                onClick={handleAddProof}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--foreground)] hover:opacity-70 font-semibold transition-opacity pt-1"
              >
                <Plus size={13} /> Add another proof link
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block uppercase tracking-wider font-semibold text-[var(--foreground)]">
                What did you complete? <span className="text-rose-500">*</span>
              </label>
              {!summary && (
                <button
                  type="button"
                  onClick={handleFillTemplate}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--foreground)] hover:opacity-70 font-semibold transition-opacity"
                >
                  <Sparkles size={11} /> Auto-fill template
                </button>
              )}
            </div>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Briefly describe the completed work and anything the owner should review."
              className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--input-background)] p-3 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-strong)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all resize-none leading-relaxed"
            />
          </div>

          <div className="pt-0.5">
            {!showExtraNotes && !notes ? (
              <button
                type="button"
                onClick={() => setShowExtraNotes(true)}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <ChevronDown size={13} /> Add a note for the owner (optional)
              </button>
            ) : (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="block uppercase tracking-wider font-semibold text-[var(--text-muted)] text-[10px]">
                    Notes for Owner (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowExtraNotes(false)}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--foreground)]"
                  >
                    Hide
                  </button>
                </div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Test login credentials, staging passwords, or specific tips"
                  className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2 px-3 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-strong)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--border-soft)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !summary.trim()}
              icon={submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
