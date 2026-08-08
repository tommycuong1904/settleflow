import { NextResponse } from "next/server";

import { getDashboardSummary } from "@/lib/repositories/dashboard";
import { resolveWorkspaceId } from "@/lib/runtime/product-context-server";

export async function GET(request: Request) {
  const workspaceId = resolveWorkspaceId(new URL(request.url).searchParams.get("workspaceId"));

  try {
    return NextResponse.json(await getDashboardSummary(workspaceId));
  } catch {
    return NextResponse.json({ error: "Unable to load dashboard summary" }, { status: 500 });
  }
}
