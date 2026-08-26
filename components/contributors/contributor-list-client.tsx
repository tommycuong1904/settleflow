"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { hasRole } from "@/lib/runtime/role-utils";
import type { ContributorListItem } from "@/lib/repositories/contributors";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";
import { AddContributorDialog } from "./add-contributor-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/shared/button";
import { useToast } from "@/lib/context/toast-context";
import {
  Search,
  UserPlus,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Briefcase,
  Mail,
  Coins,
  ArrowRight,
  ShieldCheck,
  Users,
} from "lucide-react";

type ContributorListClientProps = {
  initialContributors: ContributorListItem[];
};

export function ContributorListClient({
  initialContributors,
}: ContributorListClientProps) {
  const router = useRouter();
  const productContext = useResolvedProductContext();
  const actor = productContext.actor;
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string, name?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      variant: "success",
      title: "Address Copied",
      description: `Copied ${name ? `${name}'s` : ""} wallet address to clipboard.`,
      durationMs: 2500,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredContributors = initialContributors.filter((c) => {
    const matchesStatus =
      statusFilter === "all" ? true : c.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesStatus;

    const matchesName = c.displayName.toLowerCase().includes(query);
    const matchesWallet = c.walletAddress.toLowerCase().includes(query);
    const matchesRole = c.role?.toLowerCase().includes(query);
    const matchesEmail = c.email?.toLowerCase().includes(query);

    return matchesStatus && (matchesName || matchesWallet || matchesRole || matchesEmail);
  });

  return (
    <div className="space-y-6">
      {/* Controls: Search & Filter & CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, role, email, or wallet..."
            className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] py-2.5 pl-10 pr-4 text-xs text-[var(--foreground)] placeholder-[var(--text-muted)] focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
          />
        </div>

        {/* Status Filters & Add Button */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-[var(--surface)] p-1 border border-[var(--border-soft)] text-xs font-medium">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                statusFilter === "all"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              All ({initialContributors.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                statusFilter === "active"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Active
            </button>
            {hasRole(actor, "owner") && (
              <button
                onClick={() => setStatusFilter("archived")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  statusFilter === "archived"
                    ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
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
            className="shrink-0"
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
                : "No contributors registered yet"
            }
            description={
              searchQuery || statusFilter !== "all"
                ? "Try adjusting your search criteria or filters."
                : "Add your team members and external contributors to begin assigning milestone payouts."
            }
          />
          {!searchQuery && statusFilter === "all" && (
            <div className="flex justify-center">
              <Button
                variant="primary"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus size={15} className="mr-1.5" /> Add First Contributor
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredContributors.map((contributor) => {
            const isCopied = copiedId === contributor.id;
            const initials = contributor.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            const explorerUrl = `https://testnet.arcscan.app/address/${contributor.walletAddress}`;

            return (
              <div
                key={contributor.id}
                className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 hover:border-cyan-500/30 transition-all flex flex-col justify-between gap-5 group"
              >
                {/* Top Section: Avatar & Info */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-[var(--accent-cyan)] font-bold text-base shadow-[0_0_15px_rgba(34,211,238,0.12)] shrink-0">
                        {initials || "C"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--accent-cyan)] transition-colors">
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
                          <p className="mt-0.5 text-xs text-[var(--accent-cyan)] flex items-center gap-1.5">
                            <Briefcase size={12} /> {contributor.role}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Wallet & Email */}
                  <div className="mt-4 space-y-2 pt-3 border-t border-[var(--border-soft)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-mono">
                        Wallet
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-[var(--text-primary)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-lg border border-[var(--border-soft)]">
                          {shortenAddress(contributor.walletAddress)}
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(`wallet-${contributor.id}`, contributor.walletAddress, contributor.displayName)
                          }
                          className="inline-flex items-center gap-1.5 font-mono text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors"
                          title="Copy wallet address"
                        >
                          {isCopied ? (
                            <Check size={13} className="text-emerald-500" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on Arcscan"
                          className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-cyan)] transition-colors"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>

                    {contributor.email && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-mono">
                          Email
                        </span>
                        <span className="text-xs text-[var(--text-primary)] flex items-center gap-1">
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
                </div>

                {/* Bottom Section: Metrics & Actions */}
                <div className="pt-3.5 border-t border-[var(--border-soft)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        Settled
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

                  <Button
                    href={`/payouts/new?contributorId=${contributor.id}`}
                    variant="ghost"
                    className="text-xs py-1.5 px-3 h-auto"
                  >
                    New Payout <ArrowRight size={13} className="ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Contributor Modal */}
      <AddContributorDialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
