import type { Prisma } from "@prisma/client";

type CreateNotificationsInput = {
  workspaceId: string;
  userIds: string[];
  type: string;
  title: string;
  body: string;
  href: string;
};

export async function createInAppNotifications(
  tx: Prisma.TransactionClient,
  input: CreateNotificationsInput,
) {
  const userIds = [...new Set(input.userIds.filter(Boolean))];
  if (userIds.length === 0) return;
  await tx.notification.createMany({
    data: userIds.map((userId) => ({
      workspaceId: input.workspaceId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    })),
  });
}
