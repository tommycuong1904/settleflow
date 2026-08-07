import { NextResponse } from "next/server";
import { getReleaseById } from "@/lib/repositories/releases";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const release = await getReleaseById(id);
  if (!release) return NextResponse.json({ error: "Release not found." }, { status: 404 });
  return NextResponse.json({ data: release });
}
