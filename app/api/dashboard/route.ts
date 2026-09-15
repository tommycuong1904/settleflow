import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { getDashboardSummary } from "@/lib/repositories/dashboard";

export async function GET(request: Request) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }
  try {
    const context = await resolveProductContextFromRequestWithSession(request);
    if (context.actor !== "owner" && context.actor !== "contributor") {
      return apiError("FORBIDDEN_DASHBOARD_SUMMARY", { status: 403 });
    }
    return NextResponse.json(await getDashboardSummary(
      context.workspaceId,
      context.actor === "contributor" ? context.activeUserId : undefined,
      context.actor === "contributor" ? "contributor" : "owner",
    ));
  } catch (error) {
    if (error instanceof Error && (error.message === "AUTH_CONTEXT_REQUIRED" || error.message === "AUTH_ROLE_AMBIGUOUS")) {
      return apiError(error.message, { status: 403 });
    }
    return apiError("DASHBOARD_LOAD_FAILED", { message: "Unable to load dashboard summary.", status: 500 });
  }
}
