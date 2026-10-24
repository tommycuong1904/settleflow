import { expect, test } from "@playwright/test";

import { createSessionToken } from "@/lib/auth/session";
import { createTestPrismaClient } from "@/test/support/test-db";

const enabled = Boolean(process.env.SETTLEFLOW_TEST_DATABASE_URL);
test.skip(!enabled, "requires SETTLEFLOW_TEST_DATABASE_URL");

test("submit milestone dialog keeps keyboard focus contained and restores it on close", async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = createTestPrismaClient();
  let workspaceId = "";
  let ownerId = "";
  let contributorUserId = "";
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  try {
    const owner = await db.user.create({ data: { displayName: "Keyboard Owner", email: `keyboard-owner-${suffix}@example.test` } });
    const contributorUser = await db.user.create({ data: { displayName: "Keyboard Contributor", email: `keyboard-contributor-${suffix}@example.test` } });
    ownerId = owner.id;
    contributorUserId = contributorUser.id;
    const workspace = await db.workspace.create({ data: { name: "Keyboard Workspace", slug: `keyboard-${suffix}` } });
    workspaceId = workspace.id;
    await db.workspaceMember.createMany({ data: [
      { workspaceId, userId: owner.id, role: "owner" },
      { workspaceId, userId: contributorUser.id, role: "contributor" },
    ] });
    const contributor = await db.contributor.create({
      data: { workspaceId, linkedUserId: contributorUser.id, createdByUserId: owner.id, name: "Keyboard Contributor" },
    });
    const payout = await db.payout.create({
      data: { workspaceId, contributorId: contributor.id, createdByUserId: owner.id, title: "Keyboard payout", totalAmountUsdc: "10", status: "active" },
    });
    const milestone = await db.milestone.create({
      data: { payoutId: payout.id, title: "Keyboard milestone", description: "Submit with a keyboard", amountUsdc: "10", sequence: 1 },
    });
    const token = await createSessionToken(
      { userId: contributorUser.id, email: contributorUser.email!, name: contributorUser.displayName, address: null, authType: "web2_google" },
      "e2e-test-session-secret",
    );
    context = await browser.newContext();
    await context.addCookies([
      { name: "sf_session", value: token, domain: "127.0.0.1", path: "/" },
      { name: "sf_workspace_id", value: workspaceId, domain: "127.0.0.1", path: "/" },
    ]);
    const page = await context.newPage();

    await page.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    const trigger = page.getByRole("button", { name: "Submit work for review" });
    await trigger.focus();
    await trigger.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Keyboard milestone" });
    const summary = page.getByLabel(/What did you complete/);
    const closeButton = page.getByRole("button", { name: "Close dialog" });
    const submitButton = page.getByRole("button", { name: "Submit for Review" });
    await expect(dialog).toBeVisible();
    await expect(summary).toBeFocused();

    await submitButton.focus();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(submitButton).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    expect(milestone.id).toBeTruthy();
  } finally {
    await context?.close();
    if (workspaceId) {
      await db.payout.deleteMany({ where: { workspaceId } });
      await db.contributor.deleteMany({ where: { workspaceId } });
      await db.workspaceMember.deleteMany({ where: { workspaceId } });
      await db.workspace.delete({ where: { id: workspaceId } });
    }
    if (ownerId) await db.user.delete({ where: { id: ownerId } });
    if (contributorUserId) await db.user.delete({ where: { id: contributorUserId } });
    await db.$disconnect();
  }
});

test("payment review dialog prevents duplicate signing and restores keyboard focus", async ({ browser }) => {
  test.skip(process.env.NEXT_PUBLIC_ARC_EXECUTION_MODE === "real", "requires simulated payment mode");
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "1")}`;
  const recipientAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "2")}`;
  const db = createTestPrismaClient();
  let workspaceId = "";
  let ownerId = "";
  let contributorUserId = "";
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  try {
    const owner = await db.user.create({ data: { displayName: "Payment Keyboard Owner", email: `payment-keyboard-owner-${suffix}@example.test` } });
    const contributorUser = await db.user.create({ data: { displayName: "Payment Keyboard Contributor", email: `payment-keyboard-contributor-${suffix}@example.test` } });
    ownerId = owner.id;
    contributorUserId = contributorUser.id;
    const workspace = await db.workspace.create({ data: { name: "Payment Keyboard Workspace", slug: `payment-keyboard-${suffix}` } });
    workspaceId = workspace.id;
    await db.workspaceMember.createMany({ data: [
      { workspaceId, userId: owner.id, role: "owner" },
      { workspaceId, userId: contributorUser.id, role: "contributor" },
    ] });
    await db.userWallet.create({ data: { userId: owner.id, address: ownerAddress, normalizedAddress: ownerAddress, kind: "web3_eoa", authEnabled: true, transactionEnabled: true } });
    const contributor = await db.contributor.create({
      data: { workspaceId, linkedUserId: contributorUser.id, createdByUserId: owner.id, name: "Payment Keyboard Contributor", walletAddress: recipientAddress },
    });
    const payout = await db.payout.create({
      data: { workspaceId, contributorId: contributor.id, createdByUserId: owner.id, title: "Payment keyboard payout", totalAmountUsdc: "10", status: "active" },
    });
    const milestone = await db.milestone.create({
      data: { payoutId: payout.id, title: "Payment keyboard milestone", description: "Approve and review payment", amountUsdc: "10", sequence: 1, status: "approved" },
    });
    const token = await createSessionToken(
      { userId: owner.id, email: owner.email!, name: owner.displayName, address: ownerAddress, authType: "web3_wallet" },
      "e2e-test-session-secret",
    );
    context = await browser.newContext();
    await context.addCookies([
      { name: "sf_session", value: token, domain: "127.0.0.1", path: "/" },
      { name: "sf_workspace_id", value: workspaceId, domain: "127.0.0.1", path: "/" },
    ]);
    const page = await context.newPage();
    let releaseRequests = 0;
    let releaseRequestStarted: (() => void) | undefined;
    let releaseResponse: (() => void) | undefined;
    const releaseStarted = new Promise<void>((resolve) => { releaseRequestStarted = resolve; });
    const waitForReleaseResponse = new Promise<void>((resolve) => { releaseResponse = resolve; });

    await page.route(`**/api/v1/milestones/${milestone.id}/release`, async (route) => {
      releaseRequests += 1;
      releaseRequestStarted?.();
      await waitForReleaseResponse;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          release: { id: "keyboard-release", status: "queued" },
          proof: { id: "keyboard-proof", releaseId: "keyboard-release", milestoneId: milestone.id, status: "pending" },
        }),
      });
    });

    await page.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    const payButton = page.getByRole("button", { name: "Pay 10 USDC" });
    await payButton.focus();
    await payButton.press("Enter");
    await page.getByRole("button", { name: /Wallet payment/ }).click();

    const dialog = page.getByRole("dialog", { name: "Confirm before signing" });
    const closeButton = page.getByRole("button", { name: "Close release dialog" });
    const signButton = page.getByRole("button", { name: "Verify wallet & sign" });
    await expect(dialog).toBeVisible();
    await expect(closeButton).toBeFocused();

    await signButton.focus();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(signButton).toBeFocused();

    await signButton.click();
    await releaseStarted;
    await expect(signButton).toBeDisabled();
    await expect(signButton).toHaveText("Preparing wallet...");
    expect(releaseRequests).toBe(1);

    releaseResponse?.();
    await expect(signButton).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(payButton).toBeFocused();
  } finally {
    await context?.close();
    if (workspaceId) {
      await db.payout.deleteMany({ where: { workspaceId } });
      await db.contributor.deleteMany({ where: { workspaceId } });
      await db.workspaceMember.deleteMany({ where: { workspaceId } });
      await db.workspace.delete({ where: { id: workspaceId } });
    }
    if (ownerId) await db.user.delete({ where: { id: ownerId } });
    if (contributorUserId) await db.user.delete({ where: { id: contributorUserId } });
    await db.$disconnect();
  }
});
