import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookieStore } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookieStore(await cookies());
  if (!session) return NextResponse.json({ session: null }, { status: 401 });
  return NextResponse.json({ session });
}

export async function HEAD() {
  const session = await getSessionFromCookieStore(await cookies());
  return new NextResponse(null, { status: session ? 200 : 401 });
}
