import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";
import { getSessionFromCookieStore, resolveProductContextForServerPage } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieStore(cookieStore);
  if (!session) redirect("/auth-required?next=/notifications");
  const contextResult = await resolveProductContextForServerPage(cookieStore);
  if (contextResult.kind === "auth-context-required") return <ServerAuthContextState kind={contextResult.kind} />;
  if (contextResult.kind === "auth-required") redirect("/auth-required?next=/notifications");

  const notifications = await db.notification.findMany({
    where: { userId: session.userId, workspaceId: contextResult.productContext.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="sf-app-wrapper flex flex-col gap-8 py-8 md:py-12">
      <PageHeader
        eyebrow="Workspace updates"
        title="Notifications"
        description="Updates about submitted work, owner decisions, and the payment status of payouts you can access."
      />
      {notifications.length === 0 ? (
        <EmptyState title="No notifications yet" description="Important payout and milestone updates will appear here." />
      ) : (
        <section className="space-y-3">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.href}
              className={`block rounded-xl border p-4 transition-colors hover:border-[var(--border-strong)] ${notification.readAt ? "border-[var(--border-soft)] bg-[var(--surface)]" : "border-sky-500/30 bg-sky-500/5"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{notification.title}</p>
                  <p className="text-xs leading-5 text-[var(--text-muted)]">{notification.body}</p>
                </div>
                <time className="shrink-0 text-[11px] text-[var(--text-muted)]">{notification.createdAt.toLocaleDateString()}</time>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
