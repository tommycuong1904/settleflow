import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { assertCanManageWorkspaceMembers } from "@/lib/runtime/product-policy";
import { removeContributorMembership } from "@/lib/repositories/workspace-members";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  try {
    const { id: workspaceId, userId } = await params;
    const productContext = await resolveProductContextFromRequestWithSession(request);
    if (productContext.workspaceId !== workspaceId) {
      return apiError("WORKSPACE_ACCESS_DENIED", { message: "You do not have access to this workspace.", status: 403 });
    }
    const violation = assertCanManageWorkspaceMembers({ productContext, actorUserId: productContext.activeUserId });
    if (violation) return apiError(violation.code, { message: violation.message, status: violation.status });

    await removeContributorMembership(workspaceId, userId);
    return NextResponse.json({ data: { userId } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "WORKSPACE_MEMBER_REMOVE_FAILED";
    if (code === "AUTH_CONTEXT_REQUIRED" || code === "AUTH_ROLE_AMBIGUOUS") return apiError(code, { status: 403 });
    if (code === "WORKSPACE_MEMBER_NOT_FOUND") return apiError(code, { message: "Workspace member not found.", status: 404 });
    if (code === "WORKSPACE_MEMBER_REMOVAL_NOT_ALLOWED") return apiError(code, { message: "Only contributor access can be removed in this version.", status: 409 });
    return apiError("WORKSPACE_MEMBER_REMOVE_FAILED", { message: "Unable to remove this workspace member.", status: 500 });
  }
}
