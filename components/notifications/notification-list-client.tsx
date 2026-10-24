"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/button";
import { createRequestTimeout } from "@/lib/client/request-timeout";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

type NotificationListClientProps = {
  notifications: NotificationItem[];
  actor: "owner" | "contributor";
};

export function NotificationListClient({ notifications, actor }: NotificationListClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const unreadCount = items.filter((notification) => !notification.readAt).length;
  const visibleItems = showUnreadOnly ? items.filter((notification) => !notification.readAt) : items;

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
      const requestTimeout = createRequestTimeout();
      try {
        const response = await fetch(`/api/v1/notifications/${notification.id}`, { method: "PATCH", signal: requestTimeout.signal });
        if (response.ok) {
          setItems((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
          window.dispatchEvent(new Event("settleflow:notifications-updated"));
        }
      } catch {
        // Opening the linked work must not depend on updating the read state.
      } finally {
        requestTimeout.clear();
      }
    }
    router.push(notification.href);
  }

  async function markAllAsRead() {
    setIsMarkingAll(true);
    setActionError(null);
    const requestTimeout = createRequestTimeout();
    try {
      const response = await fetch("/api/v1/notifications", { method: "PATCH", signal: requestTimeout.signal });
      if (!response.ok) throw new Error("NOTIFICATION_UPDATE_FAILED");
      setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt: new Date().toISOString() }));
      window.dispatchEvent(new Event("settleflow:notifications-updated"));
    } catch (error) {
      setActionError(
        error instanceof DOMException && error.name === "AbortError"
          ? "Marking notifications as read timed out. Please try again."
          : "We couldn’t update your notifications. Please try again.",
      );
    } finally {
      requestTimeout.clear();
      setIsMarkingAll(false);
    }
  }

  const actionLabel = (type: string) => {
    if (actor === "contributor") {
      return ({
        milestone_submitted: "View submission",
        milestone_approved: "View approval",
        milestone_rejected: "Review feedback",
        release_confirmed: "View payment",
        release_failed: "View payment status",
      }[type] ?? "View payout");
    }

    return ({
      milestone_submitted: "Review work",
      milestone_approved: "Review & pay",
      milestone_rejected: "View feedback",
      release_confirmed: "View payment",
      release_failed: "Review payment",
    }[type] ?? "View payout");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
          {actionError ? <p role="alert" className="mt-1 text-xs text-rose-600">{actionError}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 || showUnreadOnly ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowUnreadOnly((current) => !current)}>
              {showUnreadOnly ? "Show all" : "Unread only"}
            </Button>
          ) : null}
          {unreadCount > 0 ? <button type="button" onClick={() => { void markAllAsRead(); }} disabled={isMarkingAll} className="text-xs font-semibold text-[var(--foreground)] underline-offset-4 hover:underline disabled:opacity-40">{isMarkingAll ? "Marking read…" : "Mark all as read"}</button> : null}
        </div>
      </div>
      <div className="divide-y divide-[var(--border-soft)]">
      {visibleItems.map((notification) => (
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
      {visibleItems.length === 0 ? (
        <div className="px-5 py-8 text-sm text-[var(--text-muted)]">No unread notifications.</div>
      ) : null}
      </div>
    </section>
  );
}
