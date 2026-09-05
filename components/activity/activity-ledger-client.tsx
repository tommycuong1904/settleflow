"use client";

import React, { useState } from "react";
import type { ActivityItem } from "@/lib/models/activity-item";
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
  Filter,
} from "lucide-react";

type ActivityLedgerClientProps = {
  initialActivities: ActivityItem[];
};

export function ActivityLedgerClient({
  initialActivities,
}: ActivityLedgerClientProps) {
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
        `"${a.occurredAt}"`,
        `"${(a.actorLabel || "").replace(/"/g, '""')}"`,
        `"${a.entityType}"`,
        `"${a.action}"`,
        `"${(a.title || "").replace(/"/g, '""')}"`,
        `"${(a.description || "").replace(/"/g, '""')}"`,
        `"${txHash}"`,
        `"${explorerUrl}"`,
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
            placeholder="Search by title, actor, txHash, or details..."
            className="w-full rounded-2xl border border-[var(--border-soft)] py-2.5 pl-10 pr-4 text-xs placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
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
              Proofs & Releases
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
              Approvals
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
              Submissions
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={filteredActivities.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[var(--foreground)] text-[var(--background)] px-3.5 py-2 text-xs font-medium hover:bg-slate-700 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
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
              : "Milestone submissions, reviewer decisions, and USDC releases will appear here in chronological order."
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
                  className="rounded-2xl border border-[var(--border-soft)] p-5 hover:border-cyan-500/30 transition-all"
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
                          <div className="h-8 w-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                            <ShieldCheck size={16} />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full border border-slate-700 text-slate-400 flex items-center justify-center">
                            <Clock size={16} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-base font-semibold">
                            {item.title}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-slate-700 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            {item.actorLabel}
                          </span>
                        </div>

                        {item.description ? (
                          <p className="text-xs leading-relaxed font-mono">
                            {item.description}
                          </p>
                        ) : null}

                        {txHash && explorerUrl ? (
                          <div className="pt-1">
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 underline underline-offset-4 font-mono transition-colors"
                            >
                              <Layers size={13} /> Arcscan: {shortenAddress(txHash)}{" "}
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right sm:shrink-0 text-xs text-slate-400 font-mono">
                      {new Date(item.occurredAt).toLocaleString()}
                    </div>
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
