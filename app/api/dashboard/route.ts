import { NextResponse } from "next/server";

import { getDashboardSummary } from "@/lib/repositories/dashboard";
import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? DEFAULT_PRODUCT_CONTEXT.workspaceId;

  try {
    return NextResponse.json(await getDashboardSummary(workspaceId));
  } catch {
    return NextResponse.json({ error: "Unable to load dashboard summary" }, { status: 500 });
  }
}
