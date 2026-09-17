import crypto from "crypto";
import { db } from "@/lib/db/client";

export class WorkspaceCreationError extends Error {
  constructor(public readonly code: "USER_NOT_FOUND" | "WORKSPACE_ALREADY_EXISTS") {
    super(code);
  }
}

function workspaceSlug(name: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
  return `${normalized}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Creates the authenticated user's first workspace and its Owner membership atomically. */
export async function createWorkspaceForUser(input: { userId: string; name: string }) {
  return db.$transaction(async (tx) => {
    // Serialize first-workspace creation for this user. Without this lock two
    // concurrent requests could both observe no membership and create owners.
    const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "User" WHERE id = ${input.userId} FOR UPDATE
    `;
    if (lockedUsers.length !== 1) throw new WorkspaceCreationError("USER_NOT_FOUND");

    const membershipCount = await tx.workspaceMember.count({ where: { userId: input.userId } });
    if (membershipCount > 0) throw new WorkspaceCreationError("WORKSPACE_ALREADY_EXISTS");

    const workspace = await tx.workspace.create({
      data: { name: input.name, slug: workspaceSlug(input.name) },
      select: { id: true, name: true, slug: true },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: input.userId, role: "owner" },
    });
    return workspace;
  });
}
