import crypto from "crypto";
import type { Prisma } from "@prisma/client";

type Transaction = Prisma.TransactionClient;

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

function defaultWorkspaceName(displayName: string) {
  const base = displayName.trim() || "My";
  return `${base.slice(0, 68)} Workspace`;
}

/**
 * Gives a first-time account one user-owned workspace during its sign-in
 * transaction. Existing memberships are never changed or supplemented.
 */
export async function ensureInitialWorkspaceForUser(
  tx: Transaction,
  input: { userId: string; displayName: string },
) {
  // Serialize bootstrap for one account. Concurrent first sign-ins then
  // cannot both observe an empty membership set and create separate owners.
  const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "User" WHERE id = ${input.userId} FOR UPDATE
  `;
  if (lockedUsers.length !== 1) throw new Error("Provisioned user was not found.");

  const existingMembership = await tx.workspaceMember.findFirst({
    where: { userId: input.userId },
    select: { workspaceId: true },
  });
  if (existingMembership) return { workspaceId: existingMembership.workspaceId, created: false };

  const name = defaultWorkspaceName(input.displayName);
  const workspace = await tx.workspace.create({
    data: { name, slug: workspaceSlug(name) },
    select: { id: true },
  });
  await tx.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: input.userId, role: "owner" },
  });
  return { workspaceId: workspace.id, created: true };
}
