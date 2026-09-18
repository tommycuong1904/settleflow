import { db } from "@/lib/db/client";
import crypto from "crypto";
import type { Prisma, WorkspaceMemberRole } from "@prisma/client";

export const INVITABLE_WORKSPACE_ROLES = ["owner", "contributor"] as const;
export type InvitableWorkspaceRole = (typeof INVITABLE_WORKSPACE_ROLES)[number];

export function isInvitableWorkspaceRole(role: unknown): role is InvitableWorkspaceRole {
  return typeof role === "string" && (INVITABLE_WORKSPACE_ROLES as readonly string[]).includes(role);
}

export type CreateInvitationInput = {
  workspaceId: string;
  createdByUserId: string;
  role: InvitableWorkspaceRole;
  email?: string | null;
  expiresInDays?: number;
};

export async function createInvitation({
  workspaceId,
  createdByUserId,
  role,
  email,
  expiresInDays = 7,
}: CreateInvitationInput) {
  if (!isInvitableWorkspaceRole(role)) throw new Error("INVITATION_ROLE_UNAVAILABLE");
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const invitation = await db.invitation.create({
    data: {
      workspaceId,
      createdByUserId,
      role,
      email: email ? email.trim().toLowerCase() : null,
      token,
      expiresAt,
      status: "pending",
    },
    include: {
      workspace: { select: { name: true, slug: true } },
    },
  });

  return invitation;
}

export async function getInvitationByToken(token: string) {
  if (!token || typeof token !== "string") return null;

  const invitation = await db.invitation.findUnique({
    where: { token: token.trim() },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
      createdBy: { select: { displayName: true, email: true } },
    },
  });

  if (!invitation) return null;

  const isExpired = invitation.expiresAt < new Date();
  return {
    ...invitation,
    isExpired,
    isValid: invitation.status === "pending" && !isExpired,
  };
}

export type AcceptInvitationResult =
  | { success: true; workspaceId: string; workspaceName: string; role: WorkspaceMemberRole }
  | { success: false; error: string };

export async function acceptInvitation(token: string, userId: string): Promise<AcceptInvitationResult> {
  const invitation = await getInvitationByToken(token);
  if (!invitation || !invitation.isValid) {
    return { success: false, error: "Invitation is invalid or expired." };
  }
  if (!isInvitableWorkspaceRole(invitation.role)) {
    return { success: false, error: "This invitation role is no longer accepted." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, error: "User not found." };
  }

  if (invitation.email && user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return {
      success: false,
      error: `This invitation was sent to ${invitation.email}, but you are signed in as ${user.email}.`,
    };
  }

  return await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const claimed = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      data: { status: "accepted" },
    });
    if (claimed.count !== 1) {
      return { success: false as const, error: "Invitation is invalid or expired." };
    }

    // The workspace/user unique constraint preserves an existing role and
    // makes concurrent invitation acceptance idempotent.
    const membership = await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
      update: {},
      create: {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      },
    });

    // Auto-claim / Link Contributor record if role is contributor or matching email/wallet exists
    if (invitation.role === "contributor" || user.email || user.walletAddress) {
      const contributorWhere: Prisma.ContributorWhereInput[] = [];
      if (user.email) contributorWhere.push({ email: user.email.toLowerCase() });
      if (user.walletAddress) {
        contributorWhere.push({
          walletAddress: { equals: user.walletAddress, mode: "insensitive" },
        });
      }

      if (contributorWhere.length > 0) {
        const matchingContributor = await tx.contributor.findFirst({
          where: {
            workspaceId: invitation.workspaceId,
            OR: contributorWhere,
          },
        });

        if (matchingContributor && !matchingContributor.linkedUserId) {
          await tx.contributor.update({
            where: { id: matchingContributor.id },
            data: { linkedUserId: userId },
          });
        }
      }
    }

    return {
      success: true as const,
      workspaceId: invitation.workspaceId,
      workspaceName: invitation.workspace.name,
      role: membership.role,
    };
  });
}
