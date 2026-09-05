"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import {
  X,
  Pencil,
  Wallet,
  Mail,
  Briefcase,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { useToast } from "@/lib/context/toast-context";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import type { ContributorListItem } from "@/lib/repositories/contributors";

type EditContributorDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contributor: ContributorListItem | null;
};

export function EditContributorDialog({
  isOpen,
  onClose,
  onSuccess,
  contributor,
}: EditContributorDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState(contributor?.displayName ?? "");
  const [walletAddress, setWalletAddress] = useState(contributor?.walletAddress ?? "");
  const [role, setRole] = useState(contributor?.role ?? "");
  const [email, setEmail] = useState(contributor?.email ?? "");
  const [notes, setNotes] = useState(contributor?.notes ?? "");
  const [status, setStatus] = useState<"active" | "archived">(
    contributor?.status ?? "active",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useScrollLock(isOpen);

  if (!isOpen || !contributor) return null;

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
      const res = await fetch(`/api/v1/contributors/${contributor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          walletAddress: cleanAddress,
          role: role.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update contributor.");
      }

      toast({
        variant: "success",
        title: "Contributor Updated",
        description: `${name.trim()}'s details have been saved.`,
      });

      setSuccessMessage("Contributor updated successfully!");
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async () => {
    setError(null);
    const nextStatus: "active" | "archived" =
      status === "active" ? "archived" : "active";

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/contributors/${contributor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update contributor status.");
      }

      toast({
        variant: "success",
        title: nextStatus === "archived" ? "Contributor Archived" : "Contributor Restored",
        description:
          nextStatus === "archived"
            ? `${name.trim()} is now hidden from active lists and can no longer be assigned new payouts.`
            : `${name.trim()} is active again and can be assigned payouts.`,
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
      setIsUpdatingStatus(false);
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
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting || isUpdatingStatus}
          className="absolute right-5 top-5 rounded-full p-1.5 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border shrink-0">
            <Pencil size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Edit Contributor</h2>
            <p className="text-xs mt-0.5">
              Update recipient details or archive this contributor.
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
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
              Display Name / Pseudonym <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice Walker, zkBuilder"
              className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] py-2.5 px-3.5 text-sm text-[var(--foreground)] placeholder-[var(--text-muted)] focus:border-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all"
            />
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
              Arc / EVM Wallet Address <span className="text-cyan-400">*</span>
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
                className="w-full font-mono text-xs rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] py-2.5 pl-10 pr-3.5 text-[var(--foreground)] placeholder-[var(--text-muted)] focus:border-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all"
              />
            </div>
          </div>

          {/* Role & Email row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate py-2.5 pl-10 pr-3.5 text-xs placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate py-2.5 pl-10 pr-3.5 text-xs placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
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
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] py-2.5 pl-10 pr-3.5 text-xs text-[var(--foreground)] placeholder-[var(--text-muted)] focus:border-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant={status === "active" ? "danger" : "secondary"}
              size="sm"
              onClick={handleStatusToggle}
              disabled={isSubmitting || isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : status === "active" ? (
                <>
                  <Archive size={14} className="mr-1.5" /> Archive
                </>
              ) : (
                <>
                  <ArchiveRestore size={14} className="mr-1.5" /> Restore
                </>
              )}
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting || isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || isUpdatingStatus || !name.trim() || !walletAddress.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
