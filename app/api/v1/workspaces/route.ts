import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, getVerifiedSessionUser } from "@/lib/auth/session-server";
import { createWorkspaceForUser, WorkspaceCreationError } from "@/lib/services/workspaces";
import { PRODUCT_CONTEXT_COOKIE_NAMES } from "@/lib/runtime/product-context";

export const dynamic = "force-dynamic";

const WORKSPACE_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });

  const user = await getVerifiedSessionUser(session);
  if (!user) return apiError("AUTH_REQUIRED", { message: "A verified account is required.", status: 401 });

  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return apiError("INVALID_WORKSPACE_NAME", {
      message: "Workspace name must be between 2 and 80 characters.",
      status: 400,
    });
  }

  try {
    const workspace = await createWorkspaceForUser({ userId: user.id, name });
    const response = NextResponse.json({ workspace }, { status: 201 });
    response.cookies.set(PRODUCT_CONTEXT_COOKIE_NAMES.workspaceId, workspace.id, WORKSPACE_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    if (error instanceof WorkspaceCreationError) {
      return apiError(error.code, {
        message: error.code === "WORKSPACE_ALREADY_EXISTS"
          ? "This account already belongs to a workspace."
          : "Your account could not be found.",
        status: error.code === "WORKSPACE_ALREADY_EXISTS" ? 409 : 401,
      });
    }
    return apiError("WORKSPACE_CREATE_FAILED", { message: "Could not create the workspace.", status: 500 });
  }
}
