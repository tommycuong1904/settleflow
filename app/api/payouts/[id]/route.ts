import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import {
  getSessionFromRequest,
  resolveWorkspaceIdFromRequestWithSession,
} from "@/lib/auth/session-server";
import { getPayoutDetail } from "@/lib/repositories/payouts";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  try {
    const { id } = await params;
    const workspaceId = await resolveWorkspaceIdFromRequestWithSession(request);
    const detail = await getPayoutDetail(id, workspaceId);
    if (!detail) {
      return apiError("PAYOUT_NOT_FOUND", { message: "Payout not found.", status: 404 });
    }
    return NextResponse.json({ data: detail });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_CONTEXT_REQUIRED") {
      return apiError("AUTH_CONTEXT_REQUIRED", { status: 403 });
    }
    return apiError("PAYOUT_LOAD_FAILED", { message: "Failed to load payout.", status: 500 });
  }
}
