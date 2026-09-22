import { NextResponse } from "next/server";

import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const context = await resolveProductContextFromRequestWithSession(request);
  const { id } = await params;
  const result = await db.notification.updateMany({
    where: { id, userId: session.userId, workspaceId: context.workspaceId, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count !== 1) return NextResponse.json({ error: "NOTIFICATION_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ success: true });
}
