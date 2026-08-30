import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getReleaseById } from "@/lib/repositories/releases";
import { getSessionFromRequest, resolveWorkspaceIdFromRequestWithSession } from "@/lib/auth/session-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }
  const { id } = await params;
  try {
    const release = await getReleaseById(id, await resolveWorkspaceIdFromRequestWithSession(request));
    if (!release) return NextResponse.json({ error: "Release not found." }, { status: 404 });
    return NextResponse.json({ data: release });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_CONTEXT_REQUIRED") {
      return apiError("AUTH_CONTEXT_REQUIRED", { status: 403 });
    }
    return apiError("RELEASE_LOAD_FAILED", { message: "Failed to load release.", status: 500 });
  }
}
