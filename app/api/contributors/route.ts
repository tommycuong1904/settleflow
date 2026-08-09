import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import {
  contributorStatuses,
  isValidEnumQueryValue,
  parseEnumQueryValue,
} from "@/lib/api/list-query";
import { listContributors } from "@/lib/repositories/contributors";
import { resolveWorkspaceIdFromRequest } from "@/lib/runtime/product-context-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (!isValidEnumQueryValue(status, contributorStatuses)) {
    return apiError("INVALID_CONTRIBUTOR_STATUS", { message: "Invalid contributor status.", status: 400 });
  }

  const contributors = await listContributors({
    workspaceId: resolveWorkspaceIdFromRequest(request),
    status: parseEnumQueryValue(status, contributorStatuses),
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({ data: contributors });
}
