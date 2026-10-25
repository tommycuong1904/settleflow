import { expect, test } from "@playwright/test";
import { createSessionToken } from "@/lib/auth/session";
import { createTestPrismaClient } from "@/test/support/test-db";

const enabled = Boolean(process.env.SETTLEFLOW_TEST_DATABASE_URL);
const realMode = process.env.NEXT_PUBLIC_ARC_EXECUTION_MODE === "real";
test.skip(!enabled || !realMode, "requires test database and a real-mode build");

test("unauthorized real payment stops before connecting a browser wallet", async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "1")}`;
  const recipientAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "2")}`;
  const db = createTestPrismaClient();
  let workspaceId = "";
  let ownerId = "";
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  try {
    const owner = await db.user.create({ data: { displayName: "Readiness E2E Owner", email: `readiness-e2e-${suffix}@example.test` } });
    ownerId = owner.id;
    const workspace = await db.workspace.create({ data: { name: "Readiness E2E Workspace", slug: `readiness-e2e-${suffix}` } });
    workspaceId = workspace.id;
    await db.workspaceMember.create({ data: { workspaceId, userId: owner.id, role: "owner" } });
    const wallet = await db.userWallet.create({
      data: {
        userId: owner.id,
        address: ownerAddress,
        normalizedAddress: ownerAddress,
        kind: "web3_eoa",
        authEnabled: true,
        transactionEnabled: true,
      },
    });
    const contributor = await db.contributor.create({
      data: { workspaceId, createdByUserId: owner.id, name: "Readiness E2E Contributor", walletAddress: recipientAddress },
    });
    const payout = await db.payout.create({
      data: { workspaceId, contributorId: contributor.id, createdByUserId: owner.id, title: "Readiness E2E Payout", totalAmountUsdc: "1", status: "active", targetWalletAddress: recipientAddress },
    });
    const milestone = await db.milestone.create({
      data: { payoutId: payout.id, title: "Readiness E2E Milestone", description: "", amountUsdc: "1", sequence: 1, status: "approved" },
    });
    const token = await createSessionToken({
      userId: owner.id,
      email: owner.email!,
      name: owner.displayName,
      address: ownerAddress,
      walletId: wallet.id,
      authType: "web3_wallet",
    }, "e2e-test-session-secret");

    context = await browser.newContext();
    await context.addCookies([
      { name: "sf_session", value: token, domain: "127.0.0.1", path: "/" },
      { name: "sf_workspace_id", value: workspaceId, domain: "127.0.0.1", path: "/" },
    ]);
    const page = await context.newPage();
    await page.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);

    await page.getByRole("button", { name: "Pay 1 USDC" }).click();
    await page.getByRole("button", { name: /Wallet payment/ }).click();
    await expect(page.getByRole("heading", { name: "Confirm before signing" })).toBeVisible();
    await page.getByRole("button", { name: "Verify wallet & sign" }).click();
    await expect(page.getByRole("heading", { name: "Payments aren’t enabled in this environment" })).toBeVisible();
    await expect(page.getByText("No payment was sent. This test environment has not been authorized for live testnet payments yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: /try payment again|start a new payment/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Close", exact: true })).toBeVisible();
    await expect.poll(() => db.release.count({ where: { milestoneId: milestone.id } })).toBe(0);
    await expect.poll(() => db.transactionProof.count({ where: { milestoneId: milestone.id } })).toBe(0);
  } finally {
    await context?.close();
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
