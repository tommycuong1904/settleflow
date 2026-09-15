import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, getVerifiedSessionUser } from "@/lib/auth/session-server";
import { acceptInvitation } from "@/lib/services/invitations";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required to accept an invitation.", status: 401 });
  }

  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
  }

  const user = await getVerifiedSessionUser(session);

  if (!user) {
    return apiError("AUTH_REQUIRED", { message: "User account required.", status: 401 });
  }

  const result = await acceptInvitation(token, user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
