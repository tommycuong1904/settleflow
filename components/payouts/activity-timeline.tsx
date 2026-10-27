"use client";

import { useSyncExternalStore } from "react";
import type { ActivityItem } from "@/lib/models/activity-item";

type ActivityTimelineProps = {
  items: ActivityItem[];
};

function formatServerTimestamp(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

function paymentKey(item: ActivityItem) {
  return item.payoutId && item.milestoneId ? `${item.payoutId}:${item.milestoneId}` : undefined;
}

function simplifyPaymentEvents(items: ActivityItem[]) {
  const confirmedProofs = new Map(items.filter((item) => item.action === "proof_confirmed").flatMap((item) => {
    const key = paymentKey(item);
    return key ? [[key, item] as const] : [];
  }));
  const confirmedReleases = new Set(items.filter((item) => item.action === "release_confirmed").flatMap((item) => {
    const key = paymentKey(item);
    return key ? [key] : [];
  }));
  const failedProofs = new Set(items.filter((item) => item.action === "proof_failed").flatMap((item) => {
    const key = paymentKey(item);
    return key ? [key] : [];
  }));
  const failedReleases = new Set(items.filter((item) => item.action === "release_failed").flatMap((item) => {
    const key = paymentKey(item);
    return key ? [key] : [];
  }));

  return items.flatMap((item) => {
    const key = paymentKey(item);
    if (item.action === "proof_confirmed" && key && confirmedReleases.has(key)) return [];
    if (item.action === "release_confirmed" && key && confirmedProofs.has(key)) {
      return [{ ...item, action: "payment_confirmed", description: undefined }];
    }
    if (item.action === "proof_confirmed") return [{ ...item, action: "payment_confirmed", description: undefined }];
    if (item.action === "proof_failed" && key && failedReleases.has(key)) return [];
    if (item.action === "release_failed" && key && failedProofs.has(key)) {
      return [{ ...item, action: "payment_failed", title: "Payment needs attention", description: "The payment could not be completed." }];
    }
    if (item.action === "proof_failed") return [{ ...item, action: "payment_failed", title: "Payment needs attention", description: "The payment could not be completed." }];
    return [item];
  });
}

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const timelineItems = simplifyPaymentEvents(items);

  return (
    timelineItems.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-primary)]">
        No activity recorded yet.
      </div>
    ) : (
      <ol>
        {timelineItems.map((item, index) => (
          <li key={item.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
            <div className="relative flex justify-center">
              {index > 0 ? <span className="absolute top-0 h-3 w-px bg-[var(--border-soft)]" /> : null}
              {index < timelineItems.length - 1 ? <span className="absolute top-3 bottom-0 w-px bg-[var(--border-soft)]" /> : null}
              <span className="relative mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--foreground)]" />
            </div>
            <div className={index === timelineItems.length - 1 ? "pb-0" : "pb-5"}>
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <p className="min-w-0 text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                <time dateTime={item.occurredAt} className="shrink-0 text-xs text-[var(--text-muted)]">
                  {hasHydrated
                    ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(item.occurredAt))
                    : formatServerTimestamp(item.occurredAt)}
                </time>
              </div>
              {item.description ? (
                <p className="mt-1.5 text-sm leading-5 text-[var(--text-primary)]">{item.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    )
  );
}
