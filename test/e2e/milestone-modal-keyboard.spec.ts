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
