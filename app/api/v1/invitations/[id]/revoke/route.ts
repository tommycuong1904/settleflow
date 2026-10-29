import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { revokePendingInvitation } from "@/lib/services/invitations";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionFromRequest(request))) return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    if (productContext.actor !== "owner") return apiError("FORBIDDEN_INVITATION_REVOKE", { message: "Only workspace owners can revoke invitations.", status: 403 });
    const { id } = await params;
    await revokePendingInvitation(productContext.workspaceId, id);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVITATION_REVOKE_FAILED";
    if (code === "AUTH_CONTEXT_REQUIRED" || code === "AUTH_ROLE_AMBIGUOUS") return apiError(code, { status: 403 });
    if (code === "INVITATION_NOT_FOUND_OR_INACTIVE") return apiError(code, { message: "Invitation is no longer active.", status: 404 });
    return apiError("INVITATION_REVOKE_FAILED", { message: "Unable to revoke this invitation.", status: 500 });
  }
}
