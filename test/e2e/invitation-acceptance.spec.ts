import { expect, test } from "@playwright/test";

import { createSessionToken } from "@/lib/auth/session";
import { createTestPrismaClient } from "@/test/support/test-db";

const enabled = Boolean(process.env.SETTLEFLOW_TEST_DATABASE_URL);
test.skip(!enabled, "requires SETTLEFLOW_TEST_DATABASE_URL");

test("an invited contributor joins the inviter workspace and lands in its dashboard", async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = createTestPrismaClient();
  let workspaceId = "";
  let personalWorkspaceId = "";
  let ownerId = "";
  let recipientId = "";
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  try {
    const owner = await db.user.create({ data: { displayName: "Invite Owner", email: `invite-owner-${suffix}@example.test` } });
    const recipient = await db.user.create({ data: { displayName: "Invite Recipient", email: `invite-recipient-${suffix}@example.test` } });
    ownerId = owner.id;
    recipientId = recipient.id;
    const workspace = await db.workspace.create({ data: { name: "Invited Workspace", slug: `invited-${suffix}` } });
    workspaceId = workspace.id;
    const personalWorkspace = await db.workspace.create({ data: { name: "Recipient Personal Workspace", slug: `recipient-personal-${suffix}` } });
    personalWorkspaceId = personalWorkspace.id;
    await db.workspaceMember.create({ data: { workspaceId, userId: owner.id, role: "owner" } });
    await db.workspaceMember.create({ data: { workspaceId: personalWorkspaceId, userId: recipient.id, role: "owner" } });
    const contributor = await db.contributor.create({
      data: { workspaceId, createdByUserId: owner.id, name: "Invite Recipient", email: recipient.email },
    });
    const payout = await db.payout.create({
      data: { workspaceId, contributorId: contributor.id, createdByUserId: owner.id, title: "Invited contributor payout", totalAmountUsdc: "0.1", status: "active" },
    });
    await db.milestone.create({
      data: { payoutId: payout.id, title: "Invited contributor milestone", description: "Submit from the invited workspace.", amountUsdc: "0.1", sequence: 1 },
    });
    const invitation = await db.invitation.create({
      data: {
        workspaceId,
        createdByUserId: owner.id,
        role: "contributor",
        email: recipient.email,
        token: crypto.randomUUID().replaceAll("-", ""),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const token = await createSessionToken(
      { userId: recipient.id, email: recipient.email!, name: recipient.displayName, address: null, authType: "web2_google" },
      "e2e-test-session-secret",
    );
    context = await browser.newContext();
    await context.addCookies([{ name: "sf_session", value: token, domain: "127.0.0.1", path: "/" }]);
    const page = await context.newPage();

    await page.goto(`/accept-invite?token=${invitation.token}`);
    await expect(page.getByRole("heading", { name: "Join Invited Workspace" })).toBeVisible();
    await expect(page.getByText("You do not need a wallet to join or work in this workspace.")).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: /Notifications/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Accept & Join Invited Workspace" }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "Today’s work" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Invited Workspace contributor/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Contributors" })).toHaveCount(0);
    const submitWorkLink = page.getByRole("link", { name: "Submit work" });
    await expect(submitWorkLink).toHaveAttribute("href", `/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await submitWorkLink.click();
    await expect(page).toHaveURL(new RegExp(`/payouts/${payout.id}\\?workspaceId=${workspaceId}`));
    await expect(page.getByRole("button", { name: "Submit work for review" })).toBeVisible();
    await expect.poll(() => db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: recipient.id } },
      select: { role: true },
    })).toEqual({ role: "contributor" });
  } finally {
    await context?.close();
    if (workspaceId) {
      await db.invitation.deleteMany({ where: { workspaceId } });
      await db.payout.deleteMany({ where: { workspaceId } });
      await db.contributor.deleteMany({ where: { workspaceId } });
      await db.workspaceMember.deleteMany({ where: { workspaceId } });
      await db.workspace.delete({ where: { id: workspaceId } });
    }
    if (personalWorkspaceId) {
      await db.workspaceMember.deleteMany({ where: { workspaceId: personalWorkspaceId } });
      await db.workspace.delete({ where: { id: personalWorkspaceId } });
    }
    if (ownerId) await db.user.delete({ where: { id: ownerId } });
    if (recipientId) await db.user.delete({ where: { id: recipientId } });
    await db.$disconnect();
  }
});
