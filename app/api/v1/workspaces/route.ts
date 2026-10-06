import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, resolveSessionMemberships } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  const resolved = await resolveSessionMemberships(session);
  if (!resolved) {
    return apiError("AUTH_CONTEXT_REQUIRED", { message: "An active workspace membership is required.", status: 403 });
  }

  const workspaces = await db.workspace.findMany({
    where: { id: { in: resolved.memberships.map((membership) => membership.workspaceId) } },
    select: { id: true, name: true },
  });
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

  return NextResponse.json({
    data: resolved.memberships.flatMap((membership) => {
      const workspace = workspaceById.get(membership.workspaceId);
      return workspace ? [{
        id: workspace.id,
        name: workspace.name,
        role: membership.role,
        personalLabel: membership.personalLabel,
      }] : [];
    }),
  });
}
