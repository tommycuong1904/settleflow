import type { Prisma, PrismaClient } from "@prisma/client";
import { getAddress } from "viem";
import { reconcileUserContributors } from "@/lib/repositories/contributors";

type Db = PrismaClient | Prisma.TransactionClient;

export async function provisionWalletUser(db: Db, address: string, walletName?: string) {
  const walletAddress = getAddress(address);
  const normalizedAddress = walletAddress.toLowerCase();
  const linkedWallet = await db.userWallet.findUnique({ where: { normalizedAddress } });
  if (linkedWallet) {
    if (!linkedWallet.authEnabled) throw new Error("WALLET_LOGIN_NOT_ENABLED");
    const linkedUser = await db.user.findUnique({ where: { id: linkedWallet.userId } });
    if (linkedUser) {
      await reconcileUserContributors(linkedUser.id);
      return Object.assign(linkedUser, { wallet: linkedWallet });
    }
    throw new Error("WALLET_LINK_USER_NOT_FOUND");
  }

  const displayName = walletName?.trim() || `Wallet ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`;
  try {
    const user = await db.user.create({
      data: {
        displayName,
        wallets: {
          create: {
            address: walletAddress,
            normalizedAddress,
            kind: "web3_eoa",
            authEnabled: true,
            transactionEnabled: true,
          },
        },
      },
      include: {
        wallets: {
          where: { normalizedAddress },
        },
      },
    });
    const wallet = user.wallets[0];
    if (!wallet) throw new Error("WALLET_CREATION_FAILED");
    await reconcileUserContributors(user.id);
    return Object.assign(user, { wallet });
  } catch (error) {
    // The globally unique wallet link resolves concurrent first sign-ins to
    // one account without consulting the retired User.walletAddress column.
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      const concurrentLink = await db.userWallet.findUnique({ where: { normalizedAddress } });
      if (concurrentLink?.authEnabled) {
        const concurrentUser = await db.user.findUnique({ where: { id: concurrentLink.userId } });
        if (concurrentUser) {
          await reconcileUserContributors(concurrentUser.id);
          return Object.assign(concurrentUser, { wallet: concurrentLink });
        }
      }
    }
    throw error;
  }
}
