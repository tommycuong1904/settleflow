import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { assertCanManageWorkspaceMembers } from "@/lib/runtime/product-policy";
import { listWorkspaceMembers } from "@/lib/repositories/workspace-members";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  try {
    const { id: workspaceId } = await params;
    const productContext = await resolveProductContextFromRequestWithSession(request);
    if (productContext.workspaceId !== workspaceId) {
      return apiError("WORKSPACE_ACCESS_DENIED", { message: "You do not have access to this workspace.", status: 403 });
    }
    const violation = assertCanManageWorkspaceMembers({ productContext, actorUserId: productContext.activeUserId });
    if (violation) return apiError(violation.code, { message: violation.message, status: violation.status });

    return NextResponse.json({ data: await listWorkspaceMembers(workspaceId) });
  } catch (error) {
    if (error instanceof Error && (error.message === "AUTH_CONTEXT_REQUIRED" || error.message === "AUTH_ROLE_AMBIGUOUS")) {
      return apiError(error.message, { status: 403 });
    }
    return apiError("WORKSPACE_MEMBERS_LOAD_FAILED", { message: "Unable to load workspace members.", status: 500 });
  }
}
