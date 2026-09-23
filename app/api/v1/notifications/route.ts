import { NextResponse } from "next/server";

import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const context = await resolveProductContextFromRequestWithSession(request);
  const notifications = await db.notification.findMany({
    where: { userId: session.userId, workspaceId: context.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((notification) => notification.readAt === null).length,
  });
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const context = await resolveProductContextFromRequestWithSession(request);
  const result = await db.notification.updateMany({
    where: { userId: session.userId, workspaceId: context.workspaceId, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ success: true, markedCount: result.count });
}
