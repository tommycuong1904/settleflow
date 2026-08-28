import { NextResponse } from "next/server";
import { getReleaseById } from "@/lib/repositories/releases";
import { resolveWorkspaceIdFromRequestWithSession } from "@/lib/auth/session-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const release = await getReleaseById(id, await resolveWorkspaceIdFromRequestWithSession(request));
  if (!release) return NextResponse.json({ error: "Release not found." }, { status: 404 });
  return NextResponse.json({ data: release });
}
