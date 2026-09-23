"use client";

import { useState } from "react";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { AccessiblePayoutListItem } from "@/lib/repositories/payouts";
import { Search, ArrowRight } from "lucide-react";

type PayoutListClientProps = {
  initialPayouts: AccessiblePayoutListItem[];
};

export function PayoutListClient({
  initialPayouts,
}: PayoutListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "draft" | "completed"
  >("all");

  const filteredPayouts = initialPayouts.filter((payout) => {
    const contributor = payout.contributor;

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
    const matchesContributor = contributor.displayName.toLowerCase().includes(query);
    const matchesWallet = contributor.walletAddress.toLowerCase().includes(query);
    const matchesWorkspace = payout.workspaceName.toLowerCase().includes(query);

    return matchesTitle || matchesContributor || matchesWallet || matchesWorkspace;
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
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search payouts or contributors..."
            className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-4 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-strong)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all"
          />
        </div>

        <div className="flex rounded-full bg-[var(--surface)] p-1 border border-[var(--border-soft)] text-xs font-medium shrink-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-full px-3 py-1.5 transition-all ${
              statusFilter === "all"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            All ({initialPayouts.length})
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
          <button
            onClick={() => setStatusFilter("draft")}
            className={`rounded-full px-3 py-1.5 transition-all ${
              statusFilter === "draft"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`rounded-full px-3 py-1.5 transition-all ${
              statusFilter === "completed"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
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
            const contributor = payout.contributor;
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
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : payout.status === "active" || payout.status === "partially_released"
                ? "border-sky-400/20 bg-sky-400/10 text-sky-800 dark:text-sky-200"
                : "border-[var(--border-soft)] bg-[var(--surface-muted)] text-slate-700 dark:text-slate-400";

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
                      Contributor:{" "}
                      <strong className="text-[var(--foreground)] font-medium">
                        {contributor.displayName}
                      </strong>{" "}
                      {contributor.walletAddress ? (
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
                    <Button href={`/payouts/${payout.id}?workspaceId=${encodeURIComponent(payout.workspaceId)}`} variant="ghost">
                      Open payout <ArrowRight size={14} className="ml-1" />
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
            <span className="text-sm text-[var(--foreground)]">
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
