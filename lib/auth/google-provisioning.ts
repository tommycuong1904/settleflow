import type { Prisma, PrismaClient } from "@prisma/client";
import { reconcileUserContributors } from "@/lib/repositories/contributors";

type Db = PrismaClient | Prisma.TransactionClient;
export type VerifiedGoogleIdentity = { sub: string; email: string; name?: string; picture?: string };

export async function provisionGoogleUser(db: Db, identity: VerifiedGoogleIdentity) {
  const email = identity.email.trim().toLowerCase();

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
      },
    });
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        googleSub: identity.sub,
        email,
        avatarUrl: identity.picture || user.avatarUrl,
      },
    });
  }

  await reconcileUserContributors(user.id);

  // Google establishes only a Google/Circle account. It must not synthesize
  // an EOA that can later be used to sign in as the same account.
  return { user };
}
