import type { ActivityItem } from "@/lib/models/activity-item";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityTimelineProps = {
  items: ActivityItem[];
};

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  return (
    <Card className="sf-shell">
      <CardHeader>
        <CardTitle>Activity timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[rgba(15,23,42,0.46)] p-4 text-sm text-[var(--text-primary)]">
            No activity recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.46)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {item.actorLabel}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(item.occurredAt).toLocaleString()}
                  </p>
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
