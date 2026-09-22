import webpush from "web-push";
import type { Prisma } from "@prisma/client";

export async function dispatchBrowserPush(tx: Prisma.TransactionClient, input: { workspaceId: string; userIds: string[]; title: string; body: string; href: string }) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const subscriptions = await tx.pushSubscription.findMany({ where: { workspaceId: input.workspaceId, userId: { in: input.userIds } } });
  await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(input));
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await tx.pushSubscription.delete({ where: { id: subscription.id } });
    }
  }));
}
