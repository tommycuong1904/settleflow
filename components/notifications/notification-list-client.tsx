"use client";

import { useRouter } from "next/navigation";

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
          className={`block w-full rounded-xl border p-4 text-left transition-colors hover:border-[var(--border-strong)] ${notification.readAt ? "border-[var(--border-soft)] bg-[var(--surface)]" : "border-sky-500/30 bg-sky-500/5"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">{notification.title}</p>
              <p className="text-xs leading-5 text-[var(--text-muted)]">{notification.body}</p>
              <span className="text-xs font-semibold text-[var(--foreground)] underline underline-offset-2">Open payout</span>
            </div>
            <time className="shrink-0 text-[11px] text-[var(--text-muted)]">{new Date(notification.createdAt).toLocaleDateString()}</time>
          </div>
        </button>
      ))}
    </section>
  );
}
