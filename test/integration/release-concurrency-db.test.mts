import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { db } from "@/lib/db/client";
import { deriveQueuedReleasePayload } from "@/lib/repositories/milestone-release";
import { createBarrier } from "@/test/support/concurrency";

const destination = "0x6666666666666666666666666666666666666666";

test("two concurrent release attempts for one milestone: exactly one active release survives via the partial unique index", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({ data: { displayName: "Concurrent Owner", email: `conc-owner-${suffix}@example.com` } });
  const workspace = await db.workspace.create({ data: { name: "Concurrent Workspace", slug: `conc-${suffix}` } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "owner" } });
  const contributor = await db.contributor.create({
    data: { workspaceId: workspace.id, createdByUserId: user.id, name: "Concurrent Contributor", walletAddress: destination },
  });
  const payout = await db.payout.create({
    data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: user.id, title: "Concurrent Payout", totalAmountUsdc: "10", status: "active", targetWalletAddress: destination },
  });
  const milestone = await db.milestone.create({
    data: { payoutId: payout.id, title: "Concurrent milestone", description: "Concurrent release race", amountUsdc: "10", sequence: 1, status: "approved" },
  });

  try {
    // Rendezvous barrier: both operations must arrive before either proceeds,
    // so both issue the INSERT while their transactions are still open.
    const barrier = createBarrier(2);

    const attemptRelease = async (): Promise<"created" | "RELEASE_ALREADY_EXISTS"> => {
      try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
          // Mirror the repository's pre-insert checks so both operations reach
          // the INSERT concurrently (neither has committed yet).
          const milestoneRow = await tx.milestone.findUnique({
            where: { id: milestone.id },
            select: { status: true, payout: { select: { id: true, status: true, targetWalletAddress: true } } },
          });
          if (!milestoneRow) throw new Error("MILESTONE_NOT_FOUND");
          if (milestoneRow.status !== "approved") throw new Error("MILESTONE_NOT_APPROVED");
          if (milestoneRow.payout.status !== "active") throw new Error("PAYOUT_NOT_RELEASE_READY");

          const existing = await tx.release.findFirst({
            where: { milestoneId: milestone.id, status: { in: ["queued", "pending"] } },
            select: { id: true },
          });
          if (existing) throw new Error("RELEASE_ALREADY_EXISTS");

          // Both transactions are now past every application-level guard. Release
          // them together so the two INSERTs race against the real partial unique
          // index Release_one_active_per_milestone.
          await barrier.wait();

          await tx.release.create({
            data: deriveQueuedReleasePayload({
              payoutId: milestoneRow.payout.id,
              milestoneId: milestone.id,
              triggeredByUserId: user.id,
              amountUsdc: new Decimal("10"),
              executionMode: "browser_wallet",
              destinationWalletAddress: milestoneRow.payout.targetWalletAddress!,
            }),
          });
        });
        return "created";
      } catch (error) {
        // Real P2002 from the partial unique index (not simulated).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return "RELEASE_ALREADY_EXISTS";
        }
        throw error;
      }
    };

    const results = await Promise.all([attemptRelease(), attemptRelease()]);

    const created = results.filter((result) => result === "created");
    const conflicts = results.filter((result) => result === "RELEASE_ALREADY_EXISTS");
    assert.equal(created.length, 1, "exactly one concurrent attempt must win");
    assert.equal(conflicts.length, 1, "the losing attempt must map to RELEASE_ALREADY_EXISTS");

    // The P0-2 invariant: at most one queued/pending release per milestone.
    const activeCount = await db.release.count({
      where: { milestoneId: milestone.id, status: { in: ["queued", "pending"] } },
    });
    assert.equal(activeCount, 1);
  } finally {
    await db.release.deleteMany({ where: { payoutId: payout.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});
