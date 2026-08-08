import { NextResponse } from "next/server";
import { listContributors } from "@/lib/repositories/contributors";
import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status && status !== "active" && status !== "archived") {
    return NextResponse.json({ error: "Invalid contributor status." }, { status: 400 });
  }

  const contributors = await listContributors({
    workspaceId: searchParams.get("workspaceId") ?? DEFAULT_PRODUCT_CONTEXT.workspaceId,
    status: status as "active" | "archived" | undefined,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({ data: contributors });
}
