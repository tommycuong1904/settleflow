"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationListClient({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const unreadCount = items.filter((notification) => !notification.readAt).length;

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
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
      window.dispatchEvent(new Event("settleflow:notifications-updated"));
    }
    router.push(notification.href);
  }

  async function markAllAsRead() {
    setIsMarkingAll(true);
    try {
      const response = await fetch("/api/v1/notifications", { method: "PATCH" });
      if (!response.ok) return;
      setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt: new Date().toISOString() }));
      window.dispatchEvent(new Event("settleflow:notifications-updated"));
    } finally {
      setIsMarkingAll(false);
    }
  }

  const actionLabel = (type: string) => ({
    milestone_submitted: "Review work",
    milestone_approved: "Review & pay",
    milestone_rejected: "View feedback",
    release_confirmed: "View payment",
    release_failed: "Review payment",
  }[type] ?? "View payout");

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-4">
        <p className="text-sm font-medium text-[var(--foreground)]">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
        {unreadCount > 0 ? <button type="button" onClick={() => { void markAllAsRead(); }} disabled={isMarkingAll} className="text-xs font-semibold text-[var(--foreground)] underline-offset-4 hover:underline disabled:opacity-40">{isMarkingAll ? "Marking read…" : "Mark all as read"}</button> : null}
      </div>
      <div className="divide-y divide-[var(--border-soft)]">
      {items.map((notification) => (
        <button
          key={notification.id}
          type="button"
          onClick={() => { void openNotification(notification); }}
          className={`relative block w-full px-5 py-3 text-left transition-colors hover:bg-[rgba(15,23,42,0.025)] ${notification.readAt ? "" : "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--foreground)]"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                {!notification.readAt ? <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-[var(--foreground)]" /> : null}
                <p className="text-sm font-semibold text-[var(--foreground)]">{notification.title}</p>
              </div>
              <p className="text-xs leading-5 text-[var(--text-muted)]">{notification.body}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--foreground)] sm:hidden">{actionLabel(notification.type)} <ArrowRight size={13} /></span>
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]">{actionLabel(notification.type)} <ArrowRight size={13} /></span>
              <time className="text-[11px] text-[var(--text-muted)]">{formatNotificationTime(notification.createdAt)}</time>
            </div>
            <time className="shrink-0 text-[11px] text-[var(--text-muted)] sm:hidden">{formatNotificationTime(notification.createdAt)}</time>
          </div>
        </button>
      ))}
      </div>
    </section>
  );
}
