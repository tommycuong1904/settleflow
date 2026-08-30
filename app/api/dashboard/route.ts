import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, resolveWorkspaceIdFromRequestWithSession } from "@/lib/auth/session-server";

import { getDashboardSummary } from "@/lib/repositories/dashboard";
export async function GET(request: Request) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  let workspaceId: string;
  try {
    workspaceId = await resolveWorkspaceIdFromRequestWithSession(request);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_CONTEXT_REQUIRED") {
      return apiError("AUTH_CONTEXT_REQUIRED", { status: 403 });
    }
    return apiError("DASHBOARD_LOAD_FAILED", { message: "Unable to resolve dashboard context.", status: 500 });
  }

  try {
    return NextResponse.json(await getDashboardSummary(workspaceId));
  } catch {
    return NextResponse.json({ error: "Unable to load dashboard summary" }, { status: 500 });
  }
}
