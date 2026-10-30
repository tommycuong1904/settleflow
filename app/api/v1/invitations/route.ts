import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import {
  getSessionFromRequest,
  resolveProductContextFromRequestWithSession,
} from "@/lib/auth/session-server";
import { listPendingInvitations } from "@/lib/services/invitations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    if (productContext.actor !== "owner") return apiError("FORBIDDEN_INVITATION_LIST", { message: "Only workspace owners can view invitations.", status: 403 });
    return NextResponse.json({ data: await listPendingInvitations(productContext.workspaceId) });
  } catch (error) {
    if (error instanceof Error && (error.message === "AUTH_CONTEXT_REQUIRED" || error.message === "AUTH_ROLE_AMBIGUOUS")) return apiError(error.message, { status: 403 });
    return apiError("INVITATION_LIST_FAILED", { message: "Unable to load invitations.", status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    if (productContext.actor !== "owner") {
      return apiError("FORBIDDEN_INVITATION_CREATE", {
        message: "Only workspace owners can create invitations.",
        status: 403,
      });
    }

    return apiError("OWNER_INVITATIONS_UNAVAILABLE", {
      message: "This workspace has one owner. Add contributors from the Contributors page.",
      status: 410,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "AUTH_CONTEXT_REQUIRED" || error.message === "AUTH_ROLE_AMBIGUOUS")) {
      return apiError(error.message, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to create invitation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
