"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationListClient({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();

  const formatNotificationTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    return sameDay
      ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  async function openNotification(notification: NotificationItem) {
    if (!notification.readAt) {
      await fetch(`/api/v1/notifications/${notification.id}`, { method: "PATCH" }).catch(() => undefined);
    }
    router.push(notification.href);
  }

  return (
    <section className="space-y-3">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          type="button"
          onClick={() => { void openNotification(notification); }}
          className={`block w-full rounded-xl border p-4 text-left transition-colors hover:border-[var(--border-strong)] ${notification.readAt ? "border-[var(--border-soft)] bg-[var(--surface)]" : "border-black/20 bg-[var(--surface-muted)]"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                {!notification.readAt ? <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-[var(--foreground)]" /> : null}
                <p className="text-sm font-semibold text-[var(--foreground)]">{notification.title}</p>
              </div>
              <p className="text-xs leading-5 text-[var(--text-muted)]">{notification.body}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]">View update <ArrowRight size={13} /></span>
            </div>
            <time className="shrink-0 text-[11px] text-[var(--text-muted)]">{formatNotificationTime(notification.createdAt)}</time>
          </div>
        </button>
      ))}
    </section>
  );
}
