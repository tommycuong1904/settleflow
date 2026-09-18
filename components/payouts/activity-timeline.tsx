"use client";

import { useSyncExternalStore } from "react";
import type { ActivityItem } from "@/lib/models/activity-item";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityTimelineProps = {
  items: ActivityItem[];
};

function formatServerTimestamp(value: string) {
  return new Date(value).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <Card className="sf-shell">
      <CardHeader>
        <CardTitle>Activity timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-primary)]">
            No activity recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {item.actorLabel}
                    </p>
                  </div>
                  <time dateTime={item.occurredAt} className="text-xs text-[var(--text-muted)]">
                    {hasHydrated
                      ? new Date(item.occurredAt).toLocaleString()
                      : formatServerTimestamp(item.occurredAt)}
                  </time>
                </div>
                {item.description ? (
                  <p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">{item.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
