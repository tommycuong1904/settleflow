import { NextResponse } from "next/server";

import { getDashboardSummary } from "@/lib/repositories/dashboard";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? undefined;

  try {
    return NextResponse.json(await getDashboardSummary(workspaceId));
  } catch {
    return NextResponse.json({ error: "Unable to load dashboard summary" }, { status: 500 });
  }
}
