"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { X, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/lib/context/toast-context";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import type { ContributorListItem } from "@/lib/repositories/contributors";

type DeleteContributorDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contributor: ContributorListItem | null;
};

export function DeleteContributorDialog({
  isOpen,
  onClose,
  onSuccess,
  contributor,
}: DeleteContributorDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useScrollLock(isOpen);

  if (!isOpen || !contributor) return null;

  const handleDelete = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/v1/contributors/${contributor.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete contributor.");
      }

      toast({
        variant: "success",
        title: "Contributor Deleted",
        description: `${contributor.displayName} was removed from this workspace.`,
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in">
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl text-[var(--foreground)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)]"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Delete Contributor
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {contributor.displayName}
              </span>
              ? This action cannot be undone.
            </p>
            {contributor.payoutCount > 0 ? (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-300">
                This contributor has {contributor.payoutCount} payout(s). Contributors
                with payouts cannot be deleted to preserve payout history. Close this
                dialog and use the archive action in Edit instead.
              </p>
            ) : (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                This contributor has no payouts and can be removed safely.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={isSubmitting || contributor.payoutCount > 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} className="mr-1.5" /> Delete Contributor
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
