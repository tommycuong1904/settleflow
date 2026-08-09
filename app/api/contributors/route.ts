import { NextResponse } from "next/server";
import { listContributors } from "@/lib/repositories/contributors";
import { resolveWorkspaceIdFromRequest } from "@/lib/runtime/product-context-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status && status !== "active" && status !== "archived") {
    return NextResponse.json({ error: "Invalid contributor status." }, { status: 400 });
  }

  const contributors = await listContributors({
    workspaceId: resolveWorkspaceIdFromRequest(request),
    status: status as "active" | "archived" | undefined,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({ data: contributors });
}
