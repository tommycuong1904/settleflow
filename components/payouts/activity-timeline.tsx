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

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    items.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-primary)]">
        No activity recorded yet.
      </div>
    ) : (
      <ol>
        {items.map((item, index) => (
          <li key={item.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
            <div className="relative flex justify-center">
              {index > 0 ? <span className="absolute top-0 h-3 w-px bg-[var(--border-soft)]" /> : null}
              {index < items.length - 1 ? <span className="absolute top-3 bottom-0 w-px bg-[var(--border-soft)]" /> : null}
              <span className="relative mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--foreground)]" />
            </div>
            <div className={index === items.length - 1 ? "pb-0" : "pb-5"}>
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
