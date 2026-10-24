"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import {
  X,
  UserPlus,
  Wallet,
  Mail,
  Briefcase,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/lib/context/toast-context";
import { createRequestTimeout } from "@/lib/client/request-timeout";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { PRODUCT_CONTEXT_HEADER_NAMES } from "@/lib/runtime/product-context";

type AddContributorDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (contributorId: string) => void;
  workspaceId: string;
};

export function AddContributorDialog({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
}: AddContributorDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanAddress = walletAddress.trim();
    if (cleanAddress && !/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      setError("For Wallet payment, enter a valid wallet address that starts with 0x.");
      return;
    }

    setIsSubmitting(true);
    const requestTimeout = createRequestTimeout();

    try {
      const res = await fetch("/api/contributors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [PRODUCT_CONTEXT_HEADER_NAMES.workspaceId]: workspaceId,
        },
        signal: requestTimeout.signal,
        body: JSON.stringify({
          name: name.trim(),
          walletAddress: cleanAddress || undefined,
          role: role.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json() as { data?: { id?: string }; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to create contributor.");
      }

      toast({
        variant: "success",
        title: "Contributor added",
        description: `${name.trim()} is ready for a payout when you are.`,
      });

      setSuccessMessage("Contributor added successfully!");
      setTimeout(() => {
        setName("");
        setWalletAddress("");
        setRole("");
        setEmail("");
        setNotes("");
        setSuccessMessage(null);
        onClose();
        if (onSuccess) {
          onSuccess(data.data?.id ?? "");
        } else {
          router.refresh();
        }
      }, 1000);
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "Adding this contributor timed out. Check your connection and try again."
          : err instanceof Error
          ? err.message
          : "We couldn't add this contributor. Please try again.",
      );
    } finally {
      requestTimeout.clear();
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-contributor-title"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[500px] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3.5 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] shrink-0">
            <UserPlus size={20} />
          </div>
          <div className="pr-8">
            <h2 id="add-contributor-title" className="text-xl font-bold tracking-tight">
              Add contributor
            </h2>
            <p className="text-xs mt-0.5">
              Start with their name and contact details. Payment setup can be added later.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice Walker"
              className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 px-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--foreground)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all"
            />
          </div>

          <div>
            <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider">
              Email <span className="normal-case font-normal tracking-normal text-[var(--text-muted)]">(optional)</span>
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--foreground)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all"
              />
            </div>
          </div>

          <details className="group rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
            <summary className="cursor-pointer text-xs font-semibold text-[var(--foreground)] marker:text-[var(--text-muted)]">Add optional details or payment setup</summary>
            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider">
                Role / Discipline
              </label>
              <div className="relative">
                <Briefcase
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Smart Contract Eng"
                  className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-3.5 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--foreground)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider">Wallet address <span className="normal-case font-normal tracking-normal text-[var(--text-muted)]">(advanced wallet payment only)</span></label>
              <div className="relative">
                <Wallet
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Add only for Wallet payment"
                  className="w-full font-mono text-xs rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-3.5 text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--foreground)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all"
                />
              </div>
            </div>
            </div>
            <div className="mt-3.5">
            <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider">
              Internal Notes (Optional)
            </label>
            <div className="relative">
              <FileText
                size={15}
                className="absolute left-3.5 top-3 text-slate-400"
              />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key delivery agreements, Discord handle, Github profile..."
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-3.5 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--foreground)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all resize-none"
              />
            </div>
            </div>
          </details>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full justify-center sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              className="w-full justify-center sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                "Save Contributor"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
