import type { Prisma, PrismaClient } from "@prisma/client";
import { getAddress } from "viem";

type Db = PrismaClient | Prisma.TransactionClient;

export async function provisionWalletUser(db: Db, address: string, walletName?: string) {
  const walletAddress = getAddress(address);
  const existing = await db.user.findFirst({
    where: { walletAddress: { equals: walletAddress, mode: "insensitive" } },
  });
  if (existing) return existing;

  const displayName = walletName?.trim() || `Wallet ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`;
  try {
    return await db.user.create({ data: { displayName, walletAddress } });
  } catch (error) {
    // The database's case-insensitive unique index resolves concurrent first
    // sign-ins to one identity. Reuse that identity when another request won.
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      const concurrent = await db.user.findFirst({
        where: { walletAddress: { equals: walletAddress, mode: "insensitive" } },
      });
      if (concurrent) return concurrent;
    }
    throw error;
  }
}
