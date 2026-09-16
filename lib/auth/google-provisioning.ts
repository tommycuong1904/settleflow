import type { Prisma, PrismaClient } from "@prisma/client";
import { deriveSmartAccountAddress } from "@/lib/auth/smart-account";

type Db = PrismaClient | Prisma.TransactionClient;
export type VerifiedGoogleIdentity = { sub: string; email: string; name?: string; picture?: string };

export async function provisionGoogleUser(db: Db, identity: VerifiedGoogleIdentity) {
  const email = identity.email.trim().toLowerCase();
  const walletAddress = deriveSmartAccountAddress(identity.sub);

  let user = await db.user.findFirst({ where: { OR: [{ googleSub: identity.sub }, { email }] } });

  if (user?.googleSub && user.googleSub !== identity.sub) {
    throw new Error("Google identity is already linked to another user.");
  }

  if (!user) {
    user = await db.user.create({
      data: {
        googleSub: identity.sub,
        email,
        displayName: identity.name || email.split("@")[0],
        avatarUrl: identity.picture,
        walletAddress,
      },
    });
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        googleSub: identity.sub,
        email,
        avatarUrl: identity.picture || user.avatarUrl,
        walletAddress: user.walletAddress || walletAddress,
      },
    });
  }

  // Authentication establishes an identity only. Workspace roles are granted
  // solely by the invitation/membership flow, regardless of sign-in method.
  return { user, walletAddress };
}
