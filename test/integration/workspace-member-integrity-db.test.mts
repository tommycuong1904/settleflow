import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";

test("database enforces one workspace membership role per user", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({
    data: { displayName: "Membership Integrity", email: `membership-${suffix}@example.com` },
  });
  const workspace = await db.workspace.create({
    data: { name: "Membership Integrity", slug: `membership-${suffix}` },
  });

  try {
    await db.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "reviewer" },
    });

    await assert.rejects(
      db.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: "contributor" },
      }),
      (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002",
    );

    const membership = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    });
    assert.equal(membership?.role, "reviewer");
  } finally {
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id, userId: user.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});
