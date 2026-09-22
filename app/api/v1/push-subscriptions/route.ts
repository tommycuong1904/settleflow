import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";

type SubscriptionBody = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const context = await resolveProductContextFromRequestWithSession(request);
  const body = await request.json().catch(() => null) as SubscriptionBody | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys.auth || !body.endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "INVALID_PUSH_SUBSCRIPTION" }, { status: 400 });
  }
  await db.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: { workspaceId: context.workspaceId, userId: session.userId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
    update: { workspaceId: context.workspaceId, userId: session.userId, p256dh: body.keys.p256dh, auth: body.keys.auth },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const body = await request.json().catch(() => null) as SubscriptionBody | null;
  if (!body?.endpoint) return NextResponse.json({ error: "INVALID_PUSH_SUBSCRIPTION" }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: session.userId } });
  return NextResponse.json({ ok: true });
}
