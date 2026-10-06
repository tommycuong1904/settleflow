import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, resolveSessionMemberships } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

function normalizePersonalLabel(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length < 2 || normalized.length > 48) return undefined;
  return normalized;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  const { id: workspaceId } = await params;
  const body = await request.json().catch(() => null) as { personalLabel?: unknown } | null;
  const personalLabel = normalizePersonalLabel(body?.personalLabel);
  if (personalLabel === undefined) {
    return apiError("INVALID_WORKSPACE_LABEL", {
      message: "Workspace label must be 2 to 48 characters, or null to reset it.",
      status: 400,
    });
  }

  const resolved = await resolveSessionMemberships(session);
  const membership = resolved?.memberships.find((item) => item.workspaceId === workspaceId);
  if (!membership || !resolved) {
    return apiError("WORKSPACE_ACCESS_DENIED", { message: "You do not have access to this workspace.", status: 403 });
  }

  const updated = await db.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: resolved.user.id } },
    data: { personalLabel },
    select: { workspaceId: true, role: true, personalLabel: true },
  });

  return NextResponse.json({ data: updated });
}
