import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { db } from "@/lib/db/client";
import { createPayout } from "@/lib/repositories/payout-creation";

test("new payout snapshots a linked contributor's Arc Circle recipient", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const circleAddress = `0x${randomBytes(20).toString("hex")}`;
  const manualAddress = `0x${randomBytes(20).toString("hex")}`;
  const owner = await db.user.create({ data: { displayName: "Owner", email: `owner-${suffix}@example.com` } });
  const contributorUser = await db.user.create({ data: { displayName: "Contributor", email: `contributor-${suffix}@example.com` } });
  const workspace = await db.workspace.create({ data: { name: `Circle recipient ${suffix}`, slug: `circle-recipient-${suffix}` } });

  try {
    await db.workspaceMember.createMany({ data: [
      { workspaceId: workspace.id, userId: owner.id, role: "owner" },
      { workspaceId: workspace.id, userId: contributorUser.id, role: "contributor" },
    ] });
    const walletLink = await db.userWallet.create({ data: {
      userId: contributorUser.id, address: circleAddress, normalizedAddress: circleAddress.toLowerCase(), kind: "circle_sca", transactionEnabled: true,
    } });
    await db.circleUserWallet.create({ data: {
      userId: contributorUser.id, walletId: `wallet-${suffix}`, address: circleAddress, blockchain: "ARC-TESTNET", accountType: "SCA", walletLinkId: walletLink.id,
    } });
    const contributor = await db.contributor.create({ data: {
      workspaceId: workspace.id, linkedUserId: contributorUser.id, name: "Contributor", email: contributorUser.email,
    } });

    const payout = await createPayout({
      workspaceId: workspace.id, createdByUserId: owner.id, contributorId: contributor.id,
      title: "Circle recipient payout", totalAmountUsdc: "1",
      milestones: [{ title: "Work", description: "Deliver work", amountUsdc: "1", sequence: 1 }],
    });
    const stored = await db.payout.findUniqueOrThrow({ where: { id: payout.id }, select: { targetWalletAddress: true } });
    assert.equal(stored.targetWalletAddress, circleAddress);

    await db.contributor.update({ where: { id: contributor.id }, data: { walletAddress: manualAddress } });
    const unchanged = await db.payout.findUniqueOrThrow({ where: { id: payout.id }, select: { targetWalletAddress: true } });
    assert.equal(unchanged.targetWalletAddress, circleAddress);
  } finally {
    await db.payout.deleteMany({ where: { workspaceId: workspace.id } });
    await db.contributor.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: [owner.id, contributorUser.id] } } }).catch(() => {});
  }
});
