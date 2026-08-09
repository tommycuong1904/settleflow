import { NextResponse } from "next/server";
import { getReleaseById } from "@/lib/repositories/releases";
import { resolveWorkspaceIdFromRequest } from "@/lib/runtime/product-context-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const release = await getReleaseById(id, resolveWorkspaceIdFromRequest(request));
  if (!release) return NextResponse.json({ error: "Release not found." }, { status: 404 });
  return NextResponse.json({ data: release });
}
