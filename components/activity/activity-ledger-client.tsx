"use client";

import React, { useState, useSyncExternalStore } from "react";
import type { AccessibleActivityItem } from "@/lib/models/activity-item";
import { shortenAddress } from "@/lib/utils/format";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/shared/button";
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  Layers,
  ExternalLink,
} from "lucide-react";

type ActivityLedgerClientProps = {
  initialActivities: AccessibleActivityItem[];
};

function formatServerTimestamp(value: string) {
  return new Date(value).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function csvCell(value: string | undefined) {
  const text = value ?? "";
  const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function ActivityLedgerClient({
  initialActivities,
}: ActivityLedgerClientProps) {
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "proofs" | "approvals" | "submissions"
  >("all");

  const filteredActivities = initialActivities.filter((item) => {
    const isProof =
      item.entityType === "proof" ||
      item.action.includes("proof") ||
      item.action.includes("release");
    const isApproval =
      item.action.includes("approve") || item.action.includes("reject");
    const isSubmission = item.action.includes("submit");

    if (selectedFilter === "proofs" && !isProof) return false;
    if (selectedFilter === "approvals" && !isApproval) return false;
    if (selectedFilter === "submissions" && !isSubmission) return false;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const matchesTitle = item.title.toLowerCase().includes(query);
    const matchesActor = item.actorLabel.toLowerCase().includes(query);
    const matchesDesc = item.description?.toLowerCase().includes(query);
    const matchesTx = item.metadata?.txHash?.toLowerCase().includes(query);

    return matchesTitle || matchesActor || matchesDesc || matchesTx;
  });

  // Pagination
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const effectivePage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const paginatedActivities = filteredActivities.slice(
    (effectivePage - 1) * itemsPerPage,
    effectivePage * itemsPerPage
  );

  const handleExportCsv = () => {
    if (initialActivities.length === 0) return;

    const headers = [
      "Timestamp",
      "Workspace",
      "Access Role",
      "Actor",
      "Entity Type",
      "Action",
      "Title",
      "Description",
      "TxHash",
      "Explorer URL",
    ];

    const rows = filteredActivities.map((a) => {
      const txHash = a.metadata?.txHash || "";
      const explorerUrl =
        a.metadata?.explorerUrl ||
        (txHash ? `https://testnet.arcscan.app/tx/${txHash}` : "");

      return [
        csvCell(a.occurredAt),
        csvCell(a.workspaceName),
        csvCell(a.membershipRole),
        csvCell(a.actorLabel),
        csvCell(a.entityType),
        csvCell(a.action),
        csvCell(a.title),
        csvCell(a.description),
        csvCell(txHash),
        csvCell(explorerUrl),
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `settleflow_activity_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Controls: Search, Filter Tabs, Export CSV */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search activity..."
            className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-4 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-strong)] focus:bg-[var(--input-focus-background)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all"
          />
        </div>

        {/* Filter Pills & Export CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-[var(--surface)] p-1 border border-[var(--border-soft)] text-xs font-medium">
            <button
              onClick={() => {
                setSelectedFilter("all");
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                selectedFilter === "all"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                  : "text-slate-400 hover:text-[var(--foreground)]"
              }`}
            >
              All ({initialActivities.length})
            </button>
            <button
              onClick={() => {
                setSelectedFilter("proofs");
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                selectedFilter === "proofs"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                  : "text-slate-400 hover:text-[var(--foreground)]"
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => {
                setSelectedFilter("approvals");
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                selectedFilter === "approvals"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                  : "text-slate-400 hover:text-[var(--foreground)]"
              }`}
            >
              Reviews
            </button>
            <button
              onClick={() => {
                setSelectedFilter("submissions");
                setCurrentPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                selectedFilter === "submissions"
                  ? "bg-[var(--foreground)] text-[var(--background)] font-semibold shadow-sm"
                  : "text-slate-400 hover:text-[var(--foreground)]"
              }`}
            >
              Submitted work
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={filteredActivities.length === 0}
            className="flex items-center gap-1.5 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] px-3.5 py-2 text-xs font-medium hover:opacity-80 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
            title="Download CSV report"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Activity Timeline List */}
      {filteredActivities.length === 0 ? (
        <EmptyState
          title={
            searchQuery || selectedFilter !== "all"
              ? "No matching activity records"
              : "No activity recorded yet"
          }
          description={
            searchQuery || selectedFilter !== "all"
              ? "Try adjusting your search criteria or category filters."
              : "Milestone submissions, owner decisions, and USDC releases will appear here in chronological order."
          }
        />
      ) : (
        <>
          <div className="space-y-3.5">
            {paginatedActivities.map((item) => {
              const isProof =
                item.entityType === "proof" || item.action.includes("proof");
              const isRelease =
                item.entityType === "release" || item.action.includes("release");
              const isApproval = item.action.includes("approve");
              const isRejected =
                item.action.includes("reject") || item.action.includes("failed");

              const txHash = item.metadata?.txHash;
              const explorerUrl =
                item.metadata?.explorerUrl ||
                (txHash ? `https://testnet.arcscan.app/tx/${txHash}` : null);

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 hover:border-[var(--border-strong)] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 shrink-0">
                        {isApproval ? (
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                          </div>
                        ) : isRejected ? (
                          <div className="h-8 w-8 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                            <XCircle size={16} />
                          </div>
                        ) : isProof || isRelease ? (
                          <div className="h-8 w-8 rounded-full bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--foreground)] flex items-center justify-center">
                            <ShieldCheck size={16} />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full border border-[var(--border-soft)] text-[var(--text-muted)] flex items-center justify-center">
                            <Clock size={16} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-base font-semibold">
                            {item.title}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            {item.actorLabel}
                          </span>
                        </div>

                        {item.description ? (
                          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                            {item.description}
                          </p>
                        ) : null}

                        {txHash && explorerUrl ? (
                          <div className="pt-1">
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground)] underline underline-offset-4 transition-colors hover:opacity-70"
                            >
                              <Layers size={13} /> Arcscan: {shortenAddress(txHash)}{" "}
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <time
                      dateTime={item.occurredAt}
                      className="text-right sm:shrink-0 text-xs text-[var(--text-muted)]"
                    >
                      {hasHydrated
                        ? new Date(item.occurredAt).toLocaleString()
                        : formatServerTimestamp(item.occurredAt)}
                    </time>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                variant="ghost"
                disabled={effectivePage === 1}
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-[var(--foreground)]">
                Page {effectivePage} of {totalPages}
              </span>
              <Button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                variant="ghost"
                disabled={effectivePage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
