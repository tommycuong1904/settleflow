import { db } from "@/lib/db/client";
import { createInvitation } from "@/lib/services/invitations";
import type { WorkspaceMemberRole } from "@prisma/client";

const VALID_ROLES: WorkspaceMemberRole[] = ["owner", "ops", "reviewer", "contributor"];

function usage(): never {
  console.error(
    "Usage: npx tsx scripts/create-invite.ts --workspace-id <id> --created-by-user-id <id> [--role <role>] [--email <email>] [--print-url]",
  );
  process.exit(2);
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const workspaceId = option(args, "--workspace-id")?.trim();
  const createdByUserId = option(args, "--created-by-user-id")?.trim();
  const role = (option(args, "--role") ?? "contributor").trim().toLowerCase() as WorkspaceMemberRole;
  const email = option(args, "--email")?.trim().toLowerCase();
  const printUrl = args.includes("--print-url");

  if (!workspaceId || !createdByUserId || !VALID_ROLES.includes(role)) usage();

  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: createdByUserId } },
    select: { role: true },
  });
  if (membership?.role !== "owner") {
    throw new Error("created-by user must be an owner of the target workspace.");
  }

  const invitation = await createInvitation({
    workspaceId,
    createdByUserId,
    role,
    email: email || undefined,
    expiresInDays: 7,
  });

  console.log(JSON.stringify({
    id: invitation.id,
    workspaceId: invitation.workspaceId,
    role: invitation.role,
    email: invitation.email,
    expiresAt: invitation.expiresAt,
    status: invitation.status,
  }, null, 2));

  if (printUrl) {
    const host = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    console.log(`${host}/accept-invite?token=${invitation.token}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}).finally(() => db.$disconnect());
