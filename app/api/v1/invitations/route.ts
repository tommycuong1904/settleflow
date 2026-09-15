import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import {
  getSessionFromRequest,
  getVerifiedSessionUser,
  resolveProductContextFromRequestWithSession,
} from "@/lib/auth/session-server";
import { createInvitation } from "@/lib/services/invitations";
import type { WorkspaceMemberRole } from "@prisma/client";

export const dynamic = "force-dynamic";

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

    const user = await getVerifiedSessionUser(session);

    if (!user) {
      return apiError("AUTH_REQUIRED", { message: "User account required.", status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      role?: string;
      email?: string;
      expiresInDays?: number;
    };

    const role = (body.role || "contributor").trim().toLowerCase() as WorkspaceMemberRole;
    if (!["owner", "ops", "reviewer", "contributor"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    if (body.email !== undefined && typeof body.email !== "string") {
      return NextResponse.json({ error: "A valid invitation email is required." }, { status: 400 });
    }
    const email = body.email?.trim().toLowerCase() || null;
    if (body.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "")) {
      return NextResponse.json({ error: "A valid invitation email is required." }, { status: 400 });
    }
    const expiresInDays = body.expiresInDays ?? 7;
    if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
      return NextResponse.json({ error: "Invitation expiry must be between 1 and 30 days." }, { status: 400 });
    }

    const invitation = await createInvitation({
      workspaceId: productContext.workspaceId,
      createdByUserId: user.id,
      role,
      email,
      expiresInDays,
    });

    const origin = request.nextUrl.origin.replace("0.0.0.0", "localhost");
    const inviteUrl = `${origin}/accept-invite?token=${invitation.token}`;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        role: invitation.role,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        token: invitation.token,
      },
      inviteUrl,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "AUTH_CONTEXT_REQUIRED" || error.message === "AUTH_ROLE_AMBIGUOUS")) {
      return apiError(error.message, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to create invitation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
