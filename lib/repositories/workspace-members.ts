import { db } from "@/lib/db/client";

export async function listWorkspaceMembers(workspaceId: string) {
  return db.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { displayName: true, email: true } },
    },
  });
}

export async function removeContributorMembership(workspaceId: string, userId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { userId: true, role: true },
  });

  if (!membership) throw new Error("WORKSPACE_MEMBER_NOT_FOUND");
  if (membership.role !== "contributor") throw new Error("WORKSPACE_MEMBER_REMOVAL_NOT_ALLOWED");

  await db.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}
