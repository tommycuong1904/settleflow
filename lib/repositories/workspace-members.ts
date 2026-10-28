import { db } from "@/lib/db/client";
import { recordActivity } from "@/lib/repositories/activity-log";

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

export async function removeContributorMembership(workspaceId: string, userId: string, actorUserId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { userId: true, role: true },
  });

  if (!membership) throw new Error("WORKSPACE_MEMBER_NOT_FOUND");
  if (membership.role !== "contributor") throw new Error("WORKSPACE_MEMBER_REMOVAL_NOT_ALLOWED");

  await db.$transaction(async (tx) => {
    await tx.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    await recordActivity(tx, {
      workspaceId,
      actorUserId,
      entityType: "workspace_member",
      entityId: userId,
      action: "workspace_member_removed",
      metadata: { removedUserId: userId, removedRole: "contributor" },
    });
  });
}
