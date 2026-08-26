"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { PayoutListItem } from "@/lib/repositories/payouts";
import type { ContributorListItem } from "@/lib/repositories/contributors";
import { Search, ArrowRight, Plus } from "lucide-react";

import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { isRole } from "@/lib/runtime/role-utils";
import { useWallet } from "@/lib/context/wallet-context";

type PayoutListClientProps = {
  initialPayouts: PayoutListItem[];
  contributors: ContributorListItem[];
};

export function PayoutListClient({
  initialPayouts,
  contributors,
}: PayoutListClientProps) {
  const productContext = useResolvedProductContext();
  const { address: connectedAddress, email: connectedEmail } = useWallet();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "draft" | "completed"
  >("all");

  const contributorMap = new Map(contributors.map((c) => [c.id, c]));
  const isContributorActor = isRole(productContext.actor, "contributor");

  const roleFilteredPayouts = initialPayouts.filter((payout) => {
    // Owner and Reviewer see all payouts
    if (!isContributorActor) return true;

    // Contributor only sees their own assigned payouts
    const contributor = contributorMap.get(payout.contributorId);
    if (!contributor) return false;

    const matchesWallet = Boolean(
      connectedAddress &&
      contributor.walletAddress &&
      connectedAddress.toLowerCase() === contributor.walletAddress.toLowerCase()
    );

    const matchesEmail = Boolean(
      connectedEmail &&
      ((contributor.email && connectedEmail.toLowerCase() === contributor.email.toLowerCase()) ||
       (contributor.displayName && connectedEmail.toLowerCase().startsWith(contributor.displayName.toLowerCase())))
    );

    return matchesWallet || matchesEmail;
  });

  const filteredPayouts = roleFilteredPayouts.filter((payout) => {
    const contributor = contributorMap.get(payout.contributorId);

    if (statusFilter === "active" && !["active", "partially_released"].includes(payout.status)) {
      return false;
    }
    if (statusFilter === "draft" && payout.status !== "draft") {
      return false;
    }
    if (statusFilter === "completed" && payout.status !== "completed") {
      return false;
    }

    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const matchesTitle = payout.title.toLowerCase().includes(query);
    const matchesContributor = contributor?.displayName.toLowerCase().includes(query);
    const matchesWallet = contributor?.walletAddress.toLowerCase().includes(query);

    return matchesTitle || matchesContributor || matchesWallet;
  });
  // Pagination
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredPayouts.length / itemsPerPage);
  const paginatedPayouts = filteredPayouts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-5">
      {/* Controls: Search & Status Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, recipient, or wallet..."
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all"
          />
        </div>

        <div className="flex rounded-xl bg-[var(--surface)] p-1 border border-[var(--border-soft)] text-xs font-medium shrink-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              statusFilter === "all"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            All ({initialPayouts.length})
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
          <button
            onClick={() => setStatusFilter("draft")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              statusFilter === "draft"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              statusFilter === "completed"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* List */}
      {filteredPayouts.length === 0 ? (
        <EmptyState
          title={
            searchQuery || statusFilter !== "all"
              ? "No matching payout agreements"
              : "No payouts created yet"
          }
          description={
            searchQuery || statusFilter !== "all"
              ? "Try adjusting your search query or status filter."
              : "Create your first milestone payout agreement to get started with Arc settlements."
          }
        />
      ) : ( <>
        <div className="space-y-3.5">
          {paginatedPayouts.map((payout) => {
            const contributor = contributorMap.get(payout.contributorId);
            const statusLabel =
              payout.status === "completed"
                ? "Completed"
                : payout.status === "partially_released"
                ? "Partially Released"
                : payout.status === "active"
                ? "Active"
                : "Draft";

            const statusBg =
              payout.status === "completed"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                : payout.status === "active" || payout.status === "partially_released"
                ? "border-sky-400/20 bg-sky-400/10 text-sky-700"
                : "border-white/10 bg-white/5 text-slate-400";

            return (
              <div
                key={payout.id}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 hover:border-[var(--border-strong)] transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-semibold text-[var(--foreground)] transition-colors">
                        {payout.title}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBg}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Recipient:{" "}
                      <strong className="text-[var(--foreground)] font-medium">
                        {contributor?.displayName ?? "Contributor"}
                      </strong>{" "}
                      {contributor?.walletAddress ? (
                        <span className="font-mono opacity-70">
                          ({shortenAddress(contributor.walletAddress)})
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        Amount
                      </p>
                      <p className="font-mono-numbers text-base font-medium text-[var(--foreground)]">
                        {formatUsdc(Number(payout.totalAmount))} USDC
                      </p>
                    </div>
                    <Button href={`/payouts/${payout.id}`} variant="ghost">
                      View Details <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-4">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              variant="ghost"
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-white">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              variant="ghost"
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </>)}
    </div>
  );
}
