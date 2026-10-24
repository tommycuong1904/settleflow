"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hasRole } from "@/lib/runtime/role-utils";
import type { ProductActor } from "@/lib/runtime/product-context";
import type { ContributorListItem } from "@/lib/repositories/contributors";
import { formatUsdc } from "@/lib/utils/format";
import { AddContributorDialog } from "./add-contributor-dialog";
import { EditContributorDialog } from "./edit-contributor-dialog";
import { DeleteContributorDialog } from "./delete-contributor-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/shared/button";
import { useToast } from "@/lib/context/toast-context";
import {
  Search,
  UserPlus,
  Copy,
  Check,
  Plus,
  Briefcase,
  Mail,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

type ContributorListClientProps = {
  initialContributors: ContributorListItem[];
  workspaceId: string;
  currentActor: ProductActor;
  activeUserId: string;
  returnTo?: string;
};

export function ContributorListClient({
  initialContributors,
  workspaceId,
  currentActor,
  activeUserId,
  returnTo,
}: ContributorListClientProps) {
  const router = useRouter();
  const actor = currentActor;
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContributor, setEditingContributor] = useState<ContributorListItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingContributor, setDeletingContributor] = useState<ContributorListItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  /** A contributor can be edited/deleted by its creator or any owner. */
  const canManageContributor = (c: ContributorListItem) =>
    hasRole(actor, "owner") || (Boolean(activeUserId) && c.createdByUserId === activeUserId);

  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});
  const [openInvitePopoverId, setOpenInvitePopoverId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const invitePopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openInvitePopoverId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        window.matchMedia("(min-width: 640px)").matches
        && !invitePopoverRef.current?.contains(event.target as Node)
      ) {
        setOpenInvitePopoverId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenInvitePopoverId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openInvitePopoverId]);

  const handleCopyClaimLink = async (contributor: ContributorListItem) => {
    try {
      setInvitingId(contributor.id);
      const res = await fetch(`/api/v1/contributors/${contributor.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate claim link.");
      }
      const inviteUrl = data?.data?.inviteUrl;
      if (inviteUrl) {
        setInviteLinks((prev) => ({ ...prev, [contributor.id]: inviteUrl }));
        setOpenInvitePopoverId(contributor.id);
        await navigator.clipboard.writeText(inviteUrl);
        setCopiedLinkId(contributor.id);
        setTimeout(() => setCopiedLinkId(null), 2000);
        toast({
          variant: "success",
          title: "Invite Link Ready!",
          description: `Link for ${contributor.displayName} copied to clipboard.`,
          durationMs: 3000,
        });
      }
    } catch (err) {
      toast({
        variant: "error",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not generate link.",
      });
    } finally {
      setInvitingId(null);
    }
  };

  const filteredContributors = initialContributors.filter((c) => {
    const matchesStatus =
      statusFilter === "all" ? true : c.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesStatus;

    const matchesName = c.displayName.toLowerCase().includes(query);
    const matchesWallet = c.walletAddress?.toLowerCase().includes(query) ?? false;
    const matchesRole = c.role?.toLowerCase().includes(query);
    const matchesEmail = c.email?.toLowerCase().includes(query);

    return matchesStatus && (matchesName || matchesWallet || matchesRole || matchesEmail);
  });

  return (
    <div className="space-y-6">
      {/* Controls: Search & Filter & CTA */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative w-full min-w-0 md:flex-1 md:max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-4 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-strong)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all"
          />
        </div>

        {/* Status Filters & Add Button */}
        <div className="flex w-full flex-wrap items-center gap-3 md:ml-auto md:w-auto md:flex-nowrap md:shrink-0">
          <div className="flex w-full self-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] p-1 text-xs font-medium md:w-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-full px-3 py-1.5 transition-all ${
                statusFilter === "all"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              All ({initialContributors.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`rounded-full px-3 py-1.5 transition-all ${
                statusFilter === "active"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Active
            </button>
            {hasRole(actor, "owner") && (
              <button
                onClick={() => setStatusFilter("archived")}
                className={`rounded-full px-3 py-1.5 transition-all ${
                  statusFilter === "archived"
                    ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
              >
                Archived
              </button>
            )}
          </div>

{hasRole(actor, "owner") && (
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full justify-center md:w-auto"
          >
            <UserPlus size={15} className="mr-1.5" /> Add Contributor
          </Button>
        )}
        </div>
      </div>

      {/* Contributor Cards List */}
      {filteredContributors.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title={
              searchQuery || statusFilter !== "all"
                ? "No matching contributors"
                : "Add your first contributor"
            }
            description={
              searchQuery || statusFilter !== "all"
                ? "Try adjusting your search criteria or filters."
                : "Start with a name and email. Payment details are only needed when you choose a payment method."
            }
          />
          {!searchQuery && statusFilter === "all" && (
            <div className="flex justify-center">
              <Button
                variant="primary"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus size={15} className="mr-1.5" /> Add contributor
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {filteredContributors.map((contributor) => {
            const initials = contributor.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            const activeInviteUrl = inviteLinks[contributor.id];
            const isInvitePopoverOpen = openInvitePopoverId === contributor.id;

            return (
              <div
                key={contributor.id}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-[var(--border-strong)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] flex flex-col justify-between gap-5 group"
              >
                {/* Top Section: Avatar & Info */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--foreground)] font-bold text-base shrink-0">
                        {initials || "C"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-[var(--foreground)]">
                            {contributor.displayName}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              contributor.status === "active"
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                                : "border border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-muted)]"
                            }`}
                          >
                            {contributor.status}
                          </span>
                        </div>
                        {contributor.role ? (
                          <p className="mt-0.5 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                            <Briefcase size={12} /> {contributor.role}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {canManageContributor(contributor) ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <div
                          ref={isInvitePopoverOpen ? invitePopoverRef : null}
                          className="relative"
                        >
                          <Button
                            variant="outline"
                            className="!h-9 !w-9 !min-h-0 !p-0 !rounded-full"
                            title={activeInviteUrl ? "View invite link" : "Generate invite link"}
                            disabled={invitingId === contributor.id}
                            onClick={() => activeInviteUrl
                              ? setOpenInvitePopoverId(isInvitePopoverOpen ? null : contributor.id)
                              : handleCopyClaimLink(contributor)}
                          >
                            {invitingId === contributor.id ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                            <span className="sr-only">{activeInviteUrl ? "View invite link" : "Generate invite link"}</span>
                          </Button>

                          {isInvitePopoverOpen && activeInviteUrl ? (
                            <div
                              className="absolute right-0 top-full z-20 mt-2 hidden w-80 rounded-xl border border-cyan-500/30 bg-[var(--surface)] p-3 shadow-lg sm:block"
                              role="dialog"
                              aria-label={`Invite link for ${contributor.displayName}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                  <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">Invite link</span>
                                  <span className="text-[10px] text-[var(--text-muted)]">Valid 7 days</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setOpenInvitePopoverId(null)}
                                  className="rounded p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)]"
                                  title="Close invite link"
                                >
                                  <X size={13} />
                                  <span className="sr-only">Close invite link</span>
                                </button>
                              </div>
                              <input
                                readOnly
                                value={activeInviteUrl}
                                className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] px-2.5 py-2 text-[11px] font-mono text-[var(--foreground)] focus:border-cyan-500/50 focus:outline-none"
                                onFocus={(e) => e.target.select()}
                              />
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopyClaimLink(contributor)}
                                  className="text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)]"
                                >
                                  Generate new link
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(activeInviteUrl);
                                    setCopiedLinkId(contributor.id);
                                    setTimeout(() => setCopiedLinkId(null), 2000);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition-all hover:border-cyan-500/40 hover:text-cyan-400"
                                >
                                  {copiedLinkId === contributor.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                  {copiedLinkId === contributor.id ? "Copied" : "Copy"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <Button variant="outline" className="!h-9 !w-9 !min-h-0 !p-0 !rounded-full" title="Edit contributor" onClick={() => {
                          setEditingContributor(contributor);
                          setIsEditModalOpen(true);
                        }}>
                          <Pencil size={14} />
                          <span className="sr-only">Edit contributor</span>
                        </Button>
                        <Button variant="outline" className="!h-9 !w-9 !min-h-0 !p-0 !rounded-full text-red-400 border-red-400/40 hover:bg-red-500/10" title="Delete contributor" onClick={() => {
                          setDeletingContributor(contributor);
                          setIsDeleteModalOpen(true);
                        }}>
                          <Trash2 size={14} />
                          <span className="sr-only">Delete contributor</span>
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {(contributor.email || contributor.notes) ? (
                    <div className="mt-4 space-y-2 pt-3 border-t border-[var(--border-soft)]">
                    {contributor.email && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-mono">
                          Email
                        </span>
                        <span className="flex min-w-0 items-center gap-1 break-all text-xs text-[var(--text-primary)]">
                          <Mail size={12} className="text-[var(--text-muted)]" />{" "}
                          {contributor.email}
                        </span>
                      </div>
                    )}

                    {contributor.notes && (
                      <p className="text-xs text-[var(--text-muted)] italic pt-1 leading-relaxed">
                        &quot;{contributor.notes}&quot;
                      </p>
                    )}
                    </div>
                  ) : null}
                </div>

                {/* Bottom Section: Metrics and primary action */}
                <div className="pt-3.5 border-t border-[var(--border-soft)] space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          Paid
                        </p>
                        <p className="text-xs font-semibold text-[var(--foreground)] font-mono">
                          {formatUsdc(contributor.totalSettledUsdc)} USDC
                        </p>
                      </div>
                      <div className="h-6 w-px bg-[var(--border-soft)]" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          Payouts
                        </p>
                        <p className="text-xs font-semibold text-[var(--foreground)] font-mono">
                          {contributor.payoutCount} ({contributor.activePayoutCount} active)
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full flex-nowrap items-center lg:w-auto">
                      <Button
                        href={`/payouts/new?contributorId=${contributor.id}&workspaceId=${encodeURIComponent(workspaceId)}`}
                        variant="ghost"
                        className="w-full justify-center text-xs lg:ml-auto lg:w-auto lg:px-3 lg:py-1.5 lg:h-auto"
                      >
                        <Plus size={13} className="mr-1" /> New Payout
                      </Button>
                    </div>
                  </div>

                  {isInvitePopoverOpen && activeInviteUrl ? (
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 sm:hidden">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">Invite link</span>
                          <span className="text-[10px] text-[var(--text-muted)]">Valid 7 days</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenInvitePopoverId(null)}
                          className="rounded p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)]"
                          title="Close invite link"
                        >
                          <X size={13} />
                          <span className="sr-only">Close invite link</span>
                        </button>
                      </div>
                      <input
                        readOnly
                        value={activeInviteUrl}
                        className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] px-2.5 py-2 text-[11px] font-mono text-[var(--foreground)] focus:border-cyan-500/50 focus:outline-none"
                        onFocus={(e) => e.target.select()}
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyClaimLink(contributor)}
                          className="text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)]"
                        >
                          Generate new link
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(activeInviteUrl);
                            setCopiedLinkId(contributor.id);
                            setTimeout(() => setCopiedLinkId(null), 2000);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition-all hover:border-cyan-500/40 hover:text-cyan-400"
                        >
                          {copiedLinkId === contributor.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          {copiedLinkId === contributor.id ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Contributor Modal */}
      <AddContributorDialog
        isOpen={isAddModalOpen}
        workspaceId={workspaceId}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(contributorId) => {
          if (returnTo) {
            const separator = returnTo.includes("?") ? "&" : "?";
            router.push(contributorId ? `${returnTo}${separator}contributorId=${encodeURIComponent(contributorId)}` : returnTo);
            return;
          }
          router.refresh();
        }}
      />

      {/* Edit Contributor Modal */}
      <EditContributorDialog
        key={editingContributor?.id ?? "none"}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingContributor(null);
        }}
        contributor={editingContributor}
        workspaceId={workspaceId}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Delete Contributor Modal */}
      <DeleteContributorDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingContributor(null);
        }}
        contributor={deletingContributor}
        workspaceId={workspaceId}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
