import { Prisma } from "@prisma/client";

export async function hasWorkspaceRole(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  userId: string,
  roles: Array<"owner" | "ops" | "reviewer" | "contributor">,
) {
  const membership = await tx.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { role: true },
  });
  return roles.includes(membership?.role as (typeof roles)[number]);
}
