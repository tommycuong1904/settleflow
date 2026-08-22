"use client";

import React, { useState } from "react";
import { Button } from "@/components/shared/button";
import { X, Send, Link as LinkIcon, Loader2, Code2, Video, Layers, Globe } from "lucide-react";
import { formatUsdc } from "@/lib/utils/format";
import type { Milestone } from "@/lib/models/milestone";
import { useWallet } from "@/lib/context/wallet-context";

type SubmitMilestoneDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  milestone: Milestone;
  onSuccess: (submissionMeta?: { submittedAt?: string; summary?: string; artifactUrl?: string }) => void;
};

const SUGGESTED_LABELS = [
  { label: "GitHub Pull Request", icon: Code2 },
  { label: "Figma Design Specs", icon: Layers },
  { label: "Loom Walkthrough Video", icon: Video },
  { label: "Live Staging / Demo App", icon: Globe },
];

export function SubmitMilestoneDialog({
  isOpen,
  onClose,
  milestone,
  onSuccess,
}: SubmitMilestoneDialogProps) {
  const [summary, setSummary] = useState(
    `Completed deliverable for "${milestone.title}". All acceptance criteria have been implemented and tested.`,
  );
  const [artifactUrl, setArtifactUrl] = useState("");
  const [artifactLabel, setArtifactLabel] = useState("GitHub Pull Request");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const { address: connectedAddress } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError("Please provide a summary of the completed work.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/v1/milestones/${milestone.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.trim(),
          artifactUrl: artifactUrl.trim() || undefined,
          artifactLabel: artifactUrl.trim() ? artifactLabel : undefined,
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
        summary: summary.trim(),
        artifactUrl: artifactUrl.trim() || undefined,
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
        className="relative w-full max-w-lg rounded-3xl border border-cyan-500/20 bg-[#0c1322] p-6 sm:p-8 shadow-[0_0_60px_rgba(34,211,238,0.15)] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-5">
          <span className="text-[11px] uppercase tracking-[0.2em] text-cyan-400 font-semibold">
            Deliverable Submission
          </span>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Submit &quot;{milestone.title}&quot;
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Value: <strong className="text-cyan-300 font-mono">{formatUsdc(milestone.amount)} USDC</strong> • Escrow release unlocks upon reviewer approval.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Deliverable Summary */}
          <div className="space-y-1.5">
            <label className="block uppercase tracking-wider font-semibold text-slate-300">
              Work Summary <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe what has been delivered, features built, or bugs solved..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all resize-none"
            />
          </div>

          {/* Deliverable Link */}
          <div className="space-y-1.5">
            <label className="block uppercase tracking-wider font-semibold text-slate-300">
              Proof / Artifact URL <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                value={artifactUrl}
                onChange={(e) => setArtifactUrl(e.target.value)}
                placeholder="https://github.com/org/repo/pull/123 or https://figma.com/file/..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Suggested Label Chips */}
          {artifactUrl.trim() && (
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-slate-400">
                Artifact Type:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_LABELS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setArtifactLabel(item.label)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all flex items-center gap-1.5 border ${
                      artifactLabel === item.label
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <item.icon size={12} /> {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="block uppercase tracking-wider font-semibold text-slate-300">
              Notes for Reviewer <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Test credentials, staging URL environment variables, or review tips"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          {/* Action CTAs */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
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
