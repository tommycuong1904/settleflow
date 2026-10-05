import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { createInvitation } from "@/lib/services/invitations";
import { getContributorOwnership } from "@/lib/repositories/contributors";
import { db } from "@/lib/db/client";
import { getAppBaseUrl } from "@/lib/utils/url";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await getSessionFromRequest(request))) {
      return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
    }

    const { id: contributorId } = await params;
    const productContext = await resolveProductContextFromRequestWithSession(request);

    if (productContext.actor !== "owner") {
      return apiError("PERMISSION_DENIED", {
        message: "Only workspace owners can generate invitation claim links.",
        status: 403,
      });
    }

    const ownership = await getContributorOwnership(contributorId, productContext.workspaceId);
    if (!ownership) {
      return apiError("CONTRIBUTOR_NOT_FOUND", {
        message: "Contributor not found in active workspace.",
        status: 404,
      });
    }

    const contributor = await db.contributor.findUnique({
      where: { id: contributorId },
      select: { id: true, email: true, name: true },
    });

    const invitation = await createInvitation({
      workspaceId: productContext.workspaceId,
      createdByUserId: productContext.activeUserId,
      role: "contributor",
      email: contributor?.email ?? null,
    });

    const baseUrl = getAppBaseUrl(request);
    const inviteUrl = `${baseUrl}/accept-invite?token=${invitation.token}`;

    return NextResponse.json({
      success: true,
      data: {
        invitationId: invitation.id,
        token: invitation.token,
        inviteUrl,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invitation link.";
    return apiError("INVITATION_CREATE_FAILED", { message, status: 400 });
  }
}
