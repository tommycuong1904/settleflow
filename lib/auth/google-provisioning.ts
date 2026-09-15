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

  // Option B: Auto-provisioning workspace is disabled by default (invitation-only model).
  // If explicitly enabled via GOOGLE_AUTO_PROVISION_DEFAULT_WORKSPACE="true", provision into default workspace.
  const autoProvision = process.env.GOOGLE_AUTO_PROVISION_DEFAULT_WORKSPACE === "true";
  let workspaceId: string | null = null;

  if (autoProvision) {
    const workspaceSlug = (process.env.GOOGLE_DEFAULT_WORKSPACE_SLUG || "settleflow-demo").trim();
    const role = process.env.GOOGLE_FIRST_LOGIN_ROLE || "owner";
    if (!["owner", "ops", "reviewer", "contributor"].includes(role)) {
      throw new Error("GOOGLE_FIRST_LOGIN_ROLE is invalid.");
    }
    const workspace = await db.workspace.findUnique({ where: { slug: workspaceSlug }, select: { id: true } });
    if (workspace) {
      workspaceId = workspace.id;
      await db.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
        update: {},
        create: { workspaceId: workspace.id, userId: user.id, role: role as "owner" | "ops" | "reviewer" | "contributor" },
      });
    }
  }

  return { user, workspaceId, walletAddress };
}
