"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { AccessibleActivityItem } from "@/lib/models/activity-item";
import { EmptyState } from "@/components/shared/empty-state";
import { Search, Download, CheckCircle2, XCircle, ShieldCheck, Clock, ExternalLink } from "lucide-react";

type ActivityFilter = "all" | "payments" | "reviews";

function formatServerTimestamp(value: string) {
  return new Date(value).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function formatDay(value: string, hydrated: boolean) {
  const date = new Date(value);
  if (!hydrated) return date.toISOString().slice(0, 10);
  const today = new Date();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (day === todayStart) return "Today";
  if (day === todayStart - 86_400_000) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function csvCell(value: string | undefined) {
  const text = value ?? "";
  const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function paymentKey(item: AccessibleActivityItem) {
  return item.payoutId && item.milestoneId ? `${item.payoutId}:${item.milestoneId}` : undefined;
}

function simplifyPaymentEvents(items: AccessibleActivityItem[]) {
  const proofs = new Map(items.filter((item) => item.action === "proof_confirmed").flatMap((item) => {
    const key = paymentKey(item);
    return key ? [[key, item] as const] : [];
  }));
  const releases = new Set(items.filter((item) => item.action === "release_confirmed").flatMap((item) => {
    const key = paymentKey(item);
    return key ? [key] : [];
  }));

  return items.flatMap((item) => {
    const key = paymentKey(item);
    if (item.action === "proof_confirmed" && key && releases.has(key)) return [];
    if (item.action === "release_confirmed" && key && proofs.has(key)) {
      return [{ ...item, action: "payment_confirmed", title: "Payment confirmed on Arc", description: undefined, metadata: proofs.get(key)!.metadata }];
    }
    if (item.action === "proof_confirmed") return [{ ...item, action: "payment_confirmed", title: "Payment confirmed on Arc", description: undefined }];
    return [item];
  });
}

export function ActivityLedgerClient({ initialActivities }: { initialActivities: AccessibleActivityItem[] }) {
  const router = useRouter();
  const hasHydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ActivityFilter>("all");
  const activities = useMemo(() => simplifyPaymentEvents(initialActivities), [initialActivities]);
  const filteredActivities = activities.filter((item) => {
    const isPayment = item.action === "payment_confirmed" || item.action.includes("proof") || item.action.includes("release");
    const isReview = item.action.includes("approve") || item.action.includes("reject");
    if (selectedFilter === "payments" && !isPayment) return false;
    if (selectedFilter === "reviews" && !isReview) return false;
    const query = searchQuery.toLowerCase().trim();
    return !query || item.title.toLowerCase().includes(query) || item.actorLabel.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query) === true || item.metadata?.txHash?.toLowerCase().includes(query) === true;
  });
  const groups = filteredActivities.reduce<Array<{ label: string; items: AccessibleActivityItem[] }>>((result, item) => {
    const label = formatDay(item.occurredAt, hasHydrated);
    const group = result.at(-1);
    if (group?.label === label) group.items.push(item); else result.push({ label, items: [item] });
    return result;
  }, []);

  const handleExportCsv = () => {
    if (!filteredActivities.length) return;
    const headers = ["Timestamp", "Workspace", "Access Role", "Actor", "Entity Type", "Action", "Title", "Description", "TxHash", "Explorer URL"];
    const rows = filteredActivities.map((item) => [csvCell(item.occurredAt), csvCell(item.workspaceName), csvCell(item.membershipRole), csvCell(item.actorLabel), csvCell(item.entityType), csvCell(item.action), csvCell(item.title), csvCell(item.description), csvCell(item.metadata?.txHash), csvCell(item.metadata?.explorerUrl)].join(","));
    const link = document.createElement("a");
    link.href = encodeURI(`data:text/csv;charset=utf-8,${[headers.join(","), ...rows].join("\n")}`);
    link.download = `settleflow_activity_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search activity" className="w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] py-2.5 pl-10 pr-4 text-xs text-[var(--foreground)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]" /></div>
      <div className="flex items-center justify-between gap-3 sm:justify-end"><div className="flex rounded-full border border-[var(--border-soft)] bg-[var(--surface)] p-1 text-xs font-medium">{(["all", "payments", "reviews"] as ActivityFilter[]).map((filter) => <button key={filter} type="button" onClick={() => setSelectedFilter(filter)} className={`rounded-full px-3 py-1.5 transition-colors ${selectedFilter === filter ? "bg-[var(--foreground)] font-semibold text-[var(--background)]" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}>{filter === "all" ? "All" : filter === "payments" ? "Payments" : "Reviews"}</button>)}</div><details className="relative shrink-0"><summary className="cursor-pointer list-none rounded-full border border-[var(--border-soft)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--foreground)]">More</summary><div className="absolute right-0 z-10 mt-2 w-36 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-1 shadow-lg"><button type="button" onClick={handleExportCsv} disabled={!filteredActivities.length} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"><Download size={13} /> Export CSV</button></div></details></div>
    </div>
    {filteredActivities.length === 0 ? <EmptyState title={searchQuery || selectedFilter !== "all" ? "No matching activity" : "No activity yet"} description={searchQuery || selectedFilter !== "all" ? "Try a different search or filter." : "Work submissions, owner decisions, and payments will appear here."} /> : <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">{groups.map((group, groupIndex) => <section key={group.label} className={groupIndex ? "border-t border-[var(--border-soft)]" : ""}><h2 className="bg-[var(--surface-muted)] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{group.label}</h2><div className="divide-y divide-[var(--border-soft)]">{group.items.map((item) => {
      const isPayment = item.action === "payment_confirmed" || item.action.includes("proof") || item.action.includes("release");
      const isApproved = item.action.includes("approve");
      const isIssue = item.action.includes("reject") || item.action.includes("failed");
      const explorerUrl = item.metadata?.explorerUrl || (item.metadata?.txHash ? `https://testnet.arcscan.app/tx/${item.metadata.txHash}` : undefined);
      return <div key={item.id} className="relative flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--surface-muted)]">{item.payoutId ? <button type="button" onClick={() => router.push(`/payouts/${item.payoutId}`)} aria-label={`View payout for ${item.title}`} className="absolute inset-0" /> : null}<div className={`relative z-[1] mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${isApproved ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : isIssue ? "border-rose-500/30 bg-rose-500/10 text-rose-500" : isPayment ? "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--foreground)]" : "border-[var(--border-soft)] text-[var(--text-muted)]"}`}>{isApproved ? <CheckCircle2 size={14} /> : isIssue ? <XCircle size={14} /> : isPayment ? <ShieldCheck size={14} /> : <Clock size={14} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p><span className="text-xs text-[var(--text-muted)]">by {item.actorLabel}</span></div>{item.description ? <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{item.description}</p> : null}</div><div className="relative z-[1] flex shrink-0 flex-col items-end gap-1.5"><time dateTime={item.occurredAt} className="text-[11px] text-[var(--text-muted)]">{hasHydrated ? new Date(item.occurredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : formatServerTimestamp(item.occurredAt)}</time>{explorerUrl ? <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--foreground)] hover:opacity-70">Proof <ExternalLink size={11} /></a> : null}</div></div>;
    })}</div></section>)}</div>}
  </div>;
}
