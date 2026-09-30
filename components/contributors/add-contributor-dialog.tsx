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
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { PRODUCT_CONTEXT_HEADER_NAMES } from "@/lib/runtime/product-context";

type AddContributorDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      setError("Please enter a valid 42-character EVM wallet address (0x...)");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contributors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [PRODUCT_CONTEXT_HEADER_NAMES.workspaceId]: workspaceId,
        },
        body: JSON.stringify({
          name: name.trim(),
          walletAddress: cleanAddress,
          role: role.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create contributor.");
      }

      toast({
        variant: "success",
        title: "Contributor Added",
        description: `${name.trim()} has been registered successfully.`,
      });

      setSuccessMessage("Contributor registered successfully!");
      setTimeout(() => {
        setName("");
        setWalletAddress("");
        setRole("");
        setEmail("");
        setNotes("");
        setSuccessMessage(null);
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl text-[var(--foreground)]"
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
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Add contributor
            </h2>
            <p className="text-xs mt-0.5">
              Add the person and wallet that will receive milestone payouts.
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
              Wallet address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Wallet
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                required
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full font-mono text-xs rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-3.5 text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--foreground)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all"
              />
            </div>
          </div>

          <details className="group rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
            <summary className="cursor-pointer text-xs font-semibold text-[var(--foreground)] marker:text-[var(--text-muted)]">Add optional details</summary>
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
              <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider">
                Email (Optional)
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
                  className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-3.5 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--foreground)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all"
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

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
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
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !name.trim() || !walletAddress.trim()}
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
