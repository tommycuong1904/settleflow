import { NextRequest, NextResponse } from "next/server";
import { getInvitationByToken } from "@/lib/services/invitations";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Token required." }, { status: 400 });
  }

  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  return NextResponse.json({
    workspaceName: invitation.workspace.name,
    workspaceSlug: invitation.workspace.slug,
    role: invitation.role,
    email: invitation.email,
    status: invitation.status,
    isExpired: invitation.isExpired,
    isValid: invitation.isValid,
    invitedBy: invitation.createdBy.displayName || invitation.createdBy.email || "Workspace Admin",
  });
}
