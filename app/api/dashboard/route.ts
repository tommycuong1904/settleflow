import { NextResponse } from "next/server";

import { getDashboardSummary } from "@/lib/repositories/dashboard";
import { resolveWorkspaceIdFromRequest } from "@/lib/runtime/product-context-server";

export async function GET(request: Request) {
  const workspaceId = resolveWorkspaceIdFromRequest(request);

  try {
    return NextResponse.json(await getDashboardSummary(workspaceId));
  } catch {
    return NextResponse.json({ error: "Unable to load dashboard summary" }, { status: 500 });
  }
}
