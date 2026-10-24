import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";
import { NotificationListClient } from "@/components/notifications/notification-list-client";
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
  const isOwner = contextResult.productContext.actor === "owner";

  return (
    <div className="sf-app-wrapper flex flex-col gap-8 py-8 md:py-12">
      <PageHeader
        eyebrow="Workspace updates"
        title="Notifications"
        description={isOwner
          ? "Review submitted work, payment updates, and other actions that need your attention."
          : "Follow owner decisions, requested changes, and payment updates for your assigned work."}
      />
      {notifications.length === 0 ? (
        <EmptyState title="No updates yet" description={isOwner ? "Updates will appear here when work is submitted, reviewed, or paid." : "Updates will appear here when your work is reviewed or a payment status changes."} />
      ) : (
        <NotificationListClient notifications={notifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt?.toISOString() ?? null,
          createdAt: notification.createdAt.toISOString(),
        }))} actor={isOwner ? "owner" : "contributor"} />
      )}
    </div>
  );
}
