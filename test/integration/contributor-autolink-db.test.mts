import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { db } from "@/lib/db/client";
import { createContributor, reconcileUserContributors } from "@/lib/repositories/contributors";
import { provisionWalletUser } from "@/lib/auth/wallet-provisioning";
import { provisionGoogleUser } from "@/lib/auth/google-provisioning";

test("contributor autolink: creates link on create, reconciles retroactively, and grants workspace membership", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const wallet1 = `0x${randomBytes(20).toString("hex")}`;
  const wallet2 = `0x${randomBytes(20).toString("hex")}`;
  const email1 = `contrib-${suffix}@example.com`;
  const email2 = `google-${suffix}@example.com`;

  const owner = await db.user.create({
    data: { displayName: "Owner User", email: `owner-${suffix}@example.com` },
  });
  const workspace = await db.workspace.create({
    data: { name: `Autolink Test WS ${suffix}`, slug: `autolink-${suffix}` },
  });
  await db.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: owner.id, role: "owner" },
  });

  try {
    // 1. Pre-exist User 1 with wallet1
    const user1 = await provisionWalletUser(db, wallet1, "User 1");
    assert.ok(user1.id);

    // Create Contributor for wallet1 -> Should auto-link immediately to User 1
    const contrib1 = await createContributor({
      workspaceId: workspace.id,
      name: "Contributor One",
      walletAddress: wallet1,
      createdByUserId: owner.id,
    });
    assert.equal(contrib1.displayName, "Contributor One");

    const dbContrib1 = await db.contributor.findUnique({ where: { id: contrib1.id } });
    assert.equal(dbContrib1?.linkedUserId, user1.id);

    // Verify WorkspaceMember was created
    const member1 = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user1.id } },
    });
    assert.equal(member1?.role, "contributor");

    // 2. Create Contributor for wallet2 BEFORE User 2 exists
    const contrib2 = await createContributor({
      workspaceId: workspace.id,
      name: "Contributor Two",
      walletAddress: wallet2,
      email: email2,
      createdByUserId: owner.id,
    });
    assert.equal(contrib2.displayName, "Contributor Two");

    let dbContrib2 = await db.contributor.findUnique({ where: { id: contrib2.id } });
    assert.equal(dbContrib2?.linkedUserId, null);

    // Now User 2 provisions via Google with email2
    const { user: user2 } = await provisionGoogleUser(db, {
      sub: `google-sub-${suffix}`,
      email: email2,
      name: "Google User Two",
    });

    // Verify User 2 was retroactively linked to Contributor Two
    dbContrib2 = await db.contributor.findUnique({ where: { id: contrib2.id } });
    assert.equal(dbContrib2?.linkedUserId, user2.id);

    const member2 = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user2.id } },
    });
    assert.equal(member2?.role, "contributor");

    // 3. Test explicit reconcileUserContributors
    const wallet3 = `0x${randomBytes(20).toString("hex")}`;
    const contrib3 = await createContributor({
      workspaceId: workspace.id,
      name: "Contributor Three",
      walletAddress: wallet3,
      createdByUserId: owner.id,
    });
    const user3 = await provisionWalletUser(db, wallet3, "User 3");
    const reconcileRes = await reconcileUserContributors(user3.id);
    assert.ok(reconcileRes.linkedCount >= 0);

    const dbContrib3 = await db.contributor.findUnique({ where: { id: contrib3.id } });
    assert.equal(dbContrib3?.linkedUserId, user3.id);
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } }).catch(() => {});
    await db.user.deleteMany({ where: { email: { contains: suffix } } }).catch(() => {});
  }
});
