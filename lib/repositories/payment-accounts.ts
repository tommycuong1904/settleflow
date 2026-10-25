import { db } from "@/lib/db/client";

/**
 * Reads a user's provider-managed payment account without exposing provider
 * credentials or wallet key material. Provisioning itself remains owned by a
 * provider adapter, so product workflows depend only on this neutral shape.
 */
export async function getPaymentAccountForUser(userId: string, provider: string) {
  return db.paymentAccount.findUnique({
    where: { userId_provider: { userId, provider } },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      status: true,
      walletLink: {
        select: {
          id: true,
          address: true,
          transactionEnabled: true,
        },
      },
    },
  });
}
