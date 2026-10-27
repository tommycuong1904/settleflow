"use client";

import { useState } from "react";
import { formatUsdc } from "@/lib/utils/format";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { AccessiblePayoutListItem } from "@/lib/repositories/payouts";
import { Search, ArrowRight } from "lucide-react";

type PayoutListClientProps = {
  initialPayouts: AccessiblePayoutListItem[];
  canCreatePayout: boolean;
};

function isActionableNextAction(nextAction: string) {
  return ["Complete setup", "Review work", "Review & pay", "Submit work"].includes(nextAction);
}

export function PayoutListClient({
  initialPayouts,
  canCreatePayout,
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
    const matchesWallet = contributor.walletAddress?.toLowerCase().includes(query) ?? false;
    const matchesWorkspace = payout.workspaceName.toLowerCase().includes(query);

    return matchesTitle || matchesContributor || matchesWallet || matchesWorkspace;
  });
  // Pagination
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredPayouts.length / itemsPerPage);
  const paginatedPayouts = filteredPayouts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const hasNoPayouts = initialPayouts.length === 0;
  const activeCount = initialPayouts.filter((payout) => ["active", "partially_released"].includes(payout.status)).length;
  const draftCount = initialPayouts.filter((payout) => payout.status === "draft").length;
  const completedCount = initialPayouts.filter((payout) => payout.status === "completed").length;

  function selectStatusFilter(nextFilter: typeof statusFilter) {
    setStatusFilter(nextFilter);
    setCurrentPage(1);
  }

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setCurrentPage(1);
  }

  return (
    <div className="space-y-5">
      {/* Controls: Search & Status Filter */}
      {!hasNoPayouts ? <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full min-w-0 md:flex-1 md:max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search payouts or people..."
            className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-4 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-strong)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all"
          />
        </div>

        <div className="grid w-full grid-cols-2 gap-1 self-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-1 text-xs font-medium md:ml-auto md:flex md:w-auto md:shrink-0 md:rounded-full">
          <button
            onClick={() => selectStatusFilter("all")}
            aria-pressed={statusFilter === "all"}
            className={`rounded-full px-3 py-1.5 text-center transition-all ${
              statusFilter === "all"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            All ({initialPayouts.length})
          </button>
          <button
            onClick={() => selectStatusFilter("active")}
            aria-pressed={statusFilter === "active"}
            className={`rounded-full px-3 py-1.5 text-center transition-all ${
              statusFilter === "active"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => selectStatusFilter("draft")}
            aria-pressed={statusFilter === "draft"}
            className={`rounded-full px-3 py-1.5 text-center transition-all ${
              statusFilter === "draft"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Drafts ({draftCount})
          </button>
          <button
            onClick={() => selectStatusFilter("completed")}
            aria-pressed={statusFilter === "completed"}
            className={`rounded-full px-3 py-1.5 text-center transition-all ${
              statusFilter === "completed"
                ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div> : null}

      {/* List */}
      {filteredPayouts.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title={
              searchQuery || statusFilter !== "all"
                ? "No matching payouts"
                : canCreatePayout
                ? "No payouts created yet"
                : "No payouts assigned yet"
            }
            description={
              searchQuery || statusFilter !== "all"
                ? "Try another search or show all payouts."
                : canCreatePayout
                ? "Create a payout to define the work, approval steps, and amount."
                : "Your workspace owner will assign your first payout. You can then review the scope and submit work here — no wallet setup is needed yet."
            }
          />
          {searchQuery || statusFilter !== "all" ? (
            <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : ( <>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] divide-y divide-[var(--border-soft)]">
          {paginatedPayouts.map((payout) => {
            const contributor = payout.contributor;
            const actionableNextAction = isActionableNextAction(payout.nextAction);
            const actionLabel = actionableNextAction ? payout.nextAction : "View payout";
            const statusLabel =
              payout.status === "completed"
                ? "Paid"
                : payout.status === "partially_released"
                ? "Partially paid"
                : payout.status === "active"
                ? "In progress"
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
                className="px-5 py-4 transition-colors hover:bg-[rgba(15,23,42,0.025)]"
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_13rem] sm:items-center sm:gap-6">
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
                      <strong className="text-[var(--foreground)] font-medium">
                        {payout.membershipRole === "contributor" ? "Assigned to you" : contributor.displayName}
                      </strong>
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {actionableNextAction ? "Next action" : "Status"}: <span className="font-medium text-[var(--text-primary)]">{payout.nextAction}</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:contents">
                    <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        Amount
                      </p>
                      <p className="font-mono-numbers text-base font-medium text-[var(--foreground)]">
                        {formatUsdc(Number(payout.totalAmount))} USDC
                      </p>
                    </div>
                    <Button href={`/payouts/${payout.id}?workspaceId=${encodeURIComponent(payout.workspaceId)}`} variant={actionableNextAction ? "secondary" : "ghost"} size="sm" className="w-full justify-center whitespace-nowrap sm:w-52">
                      {actionLabel} <ArrowRight size={14} className="ml-1" />
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
