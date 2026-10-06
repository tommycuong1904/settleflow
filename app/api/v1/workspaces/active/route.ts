import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, resolveSessionMemberships } from "@/lib/auth/session-server";
import { PRODUCT_CONTEXT_COOKIE_NAMES, PRODUCT_CONTEXT_COOKIE_OPTIONS } from "@/lib/runtime/product-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  const body = await request.json().catch(() => null) as { workspaceId?: unknown } | null;
  const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId.trim() : "";
  if (!workspaceId) {
    return apiError("INVALID_WORKSPACE_ID", { message: "workspaceId is required.", status: 400 });
  }

  const resolved = await resolveSessionMemberships(session);
  const membership = resolved?.memberships.find((item) => item.workspaceId === workspaceId);
  if (!membership) {
    return apiError("WORKSPACE_ACCESS_DENIED", { message: "You do not have access to this workspace.", status: 403 });
  }

  const response = NextResponse.json({
    data: { workspaceId: membership.workspaceId, role: membership.role },
  });
  response.cookies.set(
    PRODUCT_CONTEXT_COOKIE_NAMES.workspaceId,
    membership.workspaceId,
    PRODUCT_CONTEXT_COOKIE_OPTIONS,
  );
  return response;
}
