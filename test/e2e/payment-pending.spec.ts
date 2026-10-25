import { expect, test } from "@playwright/test";
import { createSessionToken } from "@/lib/auth/session";
import { createTestPrismaClient } from "@/test/support/test-db";

const enabled = Boolean(process.env.SETTLEFLOW_TEST_DATABASE_URL);
test.skip(!enabled, "requires SETTLEFLOW_TEST_DATABASE_URL");

test("pending payment shows a simple status on mobile without offering a retry", async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "1")}`;
  const recipientAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "2")}`;
  const db = createTestPrismaClient();
  let workspaceId = "";
  let ownerId = "";

  try {
    const owner = await db.user.create({ data: { displayName: "Pending payment owner", email: `pending-owner-${suffix}@example.test` } });
    ownerId = owner.id;
    const workspace = await db.workspace.create({ data: { name: "Pending payment workspace", slug: `pending-payment-${suffix}` } });
    workspaceId = workspace.id;
    await db.workspaceMember.create({ data: { workspaceId, userId: owner.id, role: "owner" } });
    await db.userWallet.create({ data: { userId: owner.id, address: ownerAddress, normalizedAddress: ownerAddress, kind: "web3_eoa", authEnabled: true, transactionEnabled: true } });
    const contributor = await db.contributor.create({ data: { workspaceId, createdByUserId: owner.id, name: "Pending payment contributor", walletAddress: recipientAddress } });
    const payout = await db.payout.create({ data: { workspaceId, contributorId: contributor.id, createdByUserId: owner.id, title: "Pending payment payout", totalAmountUsdc: "25", status: "active" } });
    const milestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Pending payment milestone", description: "Already sent from wallet", amountUsdc: "25", sequence: 1, status: "approved" } });
    const release = await db.release.create({ data: { payoutId: payout.id, milestoneId: milestone.id, triggeredByUserId: owner.id, amountUsdc: "25", status: "pending", executionMode: "browser_wallet", destinationWalletAddress: recipientAddress } });
    await db.transactionProof.create({ data: { payoutId: payout.id, milestoneId: milestone.id, releaseId: release.id, status: "pending" } });

    const token = await createSessionToken({ userId: owner.id, email: owner.email!, name: owner.displayName, address: ownerAddress, authType: "web3_wallet" }, "e2e-test-session-secret");
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([
      { name: "sf_session", value: token, domain: "127.0.0.1", path: "/" },
      { name: "sf_workspace_id", value: workspaceId, domain: "127.0.0.1", path: "/" },
    ]);
    const page = await context.newPage();
    await page.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);

    await expect(page.getByText("Payment processing")).toBeVisible();
    await expect(page.getByRole("button", { name: "View status" })).toBeVisible();
    await expect(page.getByRole("button", { name: /try payment again|start a new payment/i })).toHaveCount(0);
    await page.getByRole("button", { name: "View status" }).click();
    await expect(page.getByRole("heading", { name: "We’re confirming your payment" })).toBeVisible();
    await expect(page.getByText("You do not need to sign, retry, or provide any payment details.")).toBeVisible();
    await expect(page.getByRole("button", { name: /try payment again|start a new payment/i })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect.poll(() => page.getByRole("dialog").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await context.close();
  } finally {
    if (workspaceId) {
      await db.transactionProof.deleteMany({ where: { payout: { workspaceId } } });
      await db.release.deleteMany({ where: { payout: { workspaceId } } });
      await db.payout.deleteMany({ where: { workspaceId } });
      await db.contributor.deleteMany({ where: { workspaceId } });
      await db.workspaceMember.deleteMany({ where: { workspaceId } });
      await db.workspace.delete({ where: { id: workspaceId } });
    }
    if (ownerId) await db.user.delete({ where: { id: ownerId } });
    await db.$disconnect();
  }
});
