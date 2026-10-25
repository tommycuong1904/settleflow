import { expect, test } from "@playwright/test";
import { createSessionToken } from "@/lib/auth/session";
import { createTestPrismaClient } from "@/test/support/test-db";

const enabled = Boolean(process.env.SETTLEFLOW_TEST_DATABASE_URL);
test.skip(!enabled, "requires SETTLEFLOW_TEST_DATABASE_URL");

test("failed payment shows a simple support status without a retry decision", async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "1")}`;
  const recipientAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "2")}`;
  const db = createTestPrismaClient();
  let workspaceId = "";
  let ownerId = "";

  try {
    const owner = await db.user.create({ data: { displayName: "Failed payment owner", email: `failed-owner-${suffix}@example.test` } });
    ownerId = owner.id;
    const workspace = await db.workspace.create({ data: { name: "Failed payment workspace", slug: `failed-payment-${suffix}` } });
    workspaceId = workspace.id;
    await db.workspaceMember.create({ data: { workspaceId, userId: owner.id, role: "owner" } });
    await db.userWallet.create({ data: { userId: owner.id, address: ownerAddress, normalizedAddress: ownerAddress, kind: "web3_eoa", authEnabled: true, transactionEnabled: true } });
    const contributor = await db.contributor.create({ data: { workspaceId, createdByUserId: owner.id, name: "Failed payment contributor", walletAddress: recipientAddress } });
    const payout = await db.payout.create({ data: { workspaceId, contributorId: contributor.id, createdByUserId: owner.id, title: "Failed payment payout", totalAmountUsdc: "25", status: "active" } });
    const milestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Failed payment milestone", description: "Wallet was offline", amountUsdc: "25", sequence: 1, status: "approved" } });
    const release = await db.release.create({ data: { payoutId: payout.id, milestoneId: milestone.id, triggeredByUserId: owner.id, amountUsdc: "25", status: "failed", executionMode: "browser_wallet", destinationWalletAddress: recipientAddress, failedAt: new Date() } });
    await db.transactionProof.create({ data: { payoutId: payout.id, milestoneId: milestone.id, releaseId: release.id, status: "failed", failureReason: "BROWSER_WALLET_PRE_BROADCAST: Network connection failed", failedAt: new Date() } });

    const token = await createSessionToken({ userId: owner.id, email: owner.email!, name: owner.displayName, address: ownerAddress, authType: "web3_wallet" }, "e2e-test-session-secret");
    const context = await browser.newContext();
    await context.addCookies([{ name: "sf_session", value: token, domain: "127.0.0.1", path: "/" }, { name: "sf_workspace_id", value: workspaceId, domain: "127.0.0.1", path: "/" }]);
    const page = await context.newPage();
    await page.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await expect(page.getByText("Payment needs support")).toBeVisible();
    await page.getByRole("button", { name: "View status" }).click();
    await expect(page.getByRole("heading", { name: "We’re reviewing this payment" })).toBeVisible();
    await expect(page.getByText("You do not need to retry it or provide payment details.")).toBeVisible();
    await expect(page.getByRole("button", { name: /try payment again|start a new payment/i })).toHaveCount(0);
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
