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

export function defaultWorkspaceName(displayName: string, walletAddress?: string): string {
  // Wallet sign-in: always prefer the on-chain address over the wallet app name
  if (walletAddress) {
    const addr = walletAddress.trim();
    const short = addr.length >= 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
    return `Treasury (${short})`;
  }

  const trimmed = displayName.trim();
  if (!trimmed) return "Main Workspace";

  // Legacy fallback: displayName already contains an address (e.g. "Wallet 0xABCD...")
  const walletMatch = trimmed.match(/^(?:Wallet\s+)?(0x[a-fA-F0-9]{6,})/);
  if (walletMatch) {
    const raw = walletMatch[1];
    const short = raw.length >= 10 ? `${raw.slice(0, 6)}…${raw.slice(-4)}` : raw;
    return `Treasury (${short})`;
  }

  // Google / name-based sign-in: possessive form
  const name = trimmed.slice(0, 60);
  const possessive = name.toLowerCase().endsWith("s") ? `${name}'` : `${name}'s`;
  return `${possessive} Workspace`;
}

/**
 * Gives a first-time account one user-owned workspace during its sign-in
 * transaction. Existing memberships are never changed or supplemented.
 */
export async function ensureInitialWorkspaceForUser(
  tx: Transaction,
  input: { userId: string; displayName: string; walletAddress?: string },
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

  const name = defaultWorkspaceName(input.displayName, input.walletAddress);
  const workspace = await tx.workspace.create({
    data: { name, slug: workspaceSlug(name) },
    select: { id: true },
  });
  await tx.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: input.userId, role: "owner" },
  });
  return { workspaceId: workspace.id, created: true };
}
