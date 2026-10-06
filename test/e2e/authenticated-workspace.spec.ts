import { expect, test } from "@playwright/test";
import { createSessionToken } from "@/lib/auth/session";
import { createTestPrismaClient } from "@/test/support/test-db";

const enabled = Boolean(process.env.SETTLEFLOW_TEST_DATABASE_URL);
test.skip(!enabled, "requires SETTLEFLOW_TEST_DATABASE_URL");

test("owner and contributor payout views are scoped to their workspace", async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "1")}`;
  const contributorAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "2")}`;
  const db = createTestPrismaClient();
  let workspaceId = "";
  let personalWorkspaceId = "";
  let ownerId = "";
  let contributorUserId = "";

  try {
    const owner = await db.user.create({ data: { displayName: "E2E Owner", email: `owner-${suffix}@example.test` } });
    const contributorUser = await db.user.create({ data: { displayName: "E2E Contributor", email: `contributor-${suffix}@example.test` } });
    ownerId = owner.id;
    contributorUserId = contributorUser.id;
    const workspace = await db.workspace.create({ data: { name: "E2E Workspace", slug: `e2e-browser-${suffix}` } });
    workspaceId = workspace.id;
    const personalWorkspace = await db.workspace.create({ data: { name: "E2E Personal Workspace", slug: `e2e-personal-${suffix}` } });
    personalWorkspaceId = personalWorkspace.id;
    await db.workspaceMember.createMany({ data: [
      { workspaceId, userId: owner.id, role: "owner" },
      { workspaceId, userId: contributorUser.id, role: "contributor", personalLabel: "Client design work" },
      { workspaceId: personalWorkspaceId, userId: contributorUser.id, role: "owner" },
    ] });
    await db.userWallet.createMany({ data: [
      { userId: owner.id, address: ownerAddress, normalizedAddress: ownerAddress, kind: "web3_eoa", authEnabled: true, transactionEnabled: true },
      { userId: contributorUser.id, address: contributorAddress, normalizedAddress: contributorAddress, kind: "web3_eoa", authEnabled: true },
    ] });
    const contributor = await db.contributor.create({ data: { workspaceId, linkedUserId: contributorUser.id, createdByUserId: owner.id, name: "E2E Contributor", walletAddress: contributorAddress } });
    const payout = await db.payout.create({ data: { workspaceId, contributorId: contributor.id, createdByUserId: owner.id, title: "Browser-scoped payout", totalAmountUsdc: "100", status: "active" } });
    await db.milestone.create({ data: { payoutId: payout.id, title: "Browser milestone", description: "Visible to the assigned contributor", amountUsdc: "100", sequence: 1 } });

    const ownerToken = await createSessionToken({ userId: owner.id, email: owner.email!, name: owner.displayName, address: ownerAddress, authType: "web3_wallet" }, "e2e-test-session-secret");
    const contributorToken = await createSessionToken({ userId: contributorUser.id, email: contributorUser.email!, name: contributorUser.displayName, address: contributorAddress, authType: "web3_wallet" }, "e2e-test-session-secret");
    const ownerContext = await browser.newContext();
    const contributorContext = await browser.newContext();
    await ownerContext.addCookies([{ name: "sf_session", value: ownerToken, domain: "127.0.0.1", path: "/" }]);
    await contributorContext.addCookies([
      { name: "sf_session", value: contributorToken, domain: "127.0.0.1", path: "/" },
      { name: "sf_workspace_id", value: workspaceId, domain: "127.0.0.1", path: "/" },
    ]);

    const ownerPage = await ownerContext.newPage();
    await ownerPage.goto("/dashboard");
    await expect(ownerPage.getByRole("heading", { name: "Today’s work" })).toBeVisible();
    await ownerPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await expect(ownerPage.getByRole("button", { name: "Submit milestone" })).toHaveCount(0);

    const contributorPage = await contributorContext.newPage();
    await contributorPage.goto(`/payouts?workspaceId=${workspaceId}`);
    await expect(contributorPage.getByRole("link", { name: "Payouts" })).toBeVisible();
    await expect(contributorPage.getByText("Browser-scoped payout")).toBeVisible();
    await contributorPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await contributorPage.getByRole("button", { name: "Submit milestone" }).click();
    await contributorPage.getByPlaceholder("https://github.com/org/repo/pull/123").fill("https://example.test/e2e-proof");
    await contributorPage.getByLabel(/What did you complete/).fill("Browser evidence submitted by the assigned contributor.");
    await contributorPage.getByRole("button", { name: "Submit for Review" }).click();
    await expect(contributorPage.getByText("Submitted • Awaiting workspace owner review")).toBeVisible();

    await ownerPage.reload();
    await ownerPage.goto(`/notifications?workspaceId=${workspaceId}`);
    await expect(ownerPage.getByText("Milestone ready for review")).toBeVisible();
    await ownerPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await ownerPage.getByRole("button", { name: "Approve Milestone" }).click();
    await expect(ownerPage.getByText("Ready for release")).toBeVisible();

    await contributorPage.reload();
    await expect(contributorPage.getByRole("main").getByText("Waiting for owner release")).toBeVisible();
    await expect(contributorPage.getByRole("button", { name: "Release Payout" })).toHaveCount(0);
    await contributorPage.goto(`/notifications?workspaceId=${workspaceId}`);
    await expect(contributorPage.getByText("Milestone approved")).toBeVisible();

    await contributorPage.goto("/dashboard");
    await expect(contributorPage.getByText("CURRENT WORKSPACE")).toBeVisible();
    await expect(contributorPage.getByText("NAVIGATION")).toBeVisible();
    await expect(contributorPage.getByRole("button", { name: /Client design work/i })).toBeVisible();
    await expect(contributorPage.getByRole("link", { name: "Contributors" })).toHaveCount(0);
    await contributorPage.getByRole("button", { name: /Client design work/i }).click();
    await contributorPage.getByRole("button", { name: /Rename Client design work for me/i }).click();
    await contributorPage.getByLabel("Label for you").fill("Acme delivery work");
    await contributorPage.getByRole("button", { name: "Save label" }).click();
    await expect(contributorPage.getByRole("button", { name: /^Acme delivery work contributor/i })).toBeVisible();
    await contributorPage.getByRole("menuitem", { name: /E2E Personal Workspace/i }).click();
    await expect(contributorPage).toHaveURL(/\/dashboard$/);
    await expect(contributorPage.getByRole("button", { name: /E2E Personal Workspace/i })).toBeVisible();
    await expect(contributorPage.getByRole("link", { name: "Contributors" })).toBeVisible();

    await contributorPage.getByRole("button", { name: /E2E Personal Workspace/i }).click();
    await contributorPage.getByRole("menuitem", { name: /Acme delivery work/i }).click();
    await expect(contributorPage.getByRole("button", { name: /Acme delivery work/i })).toBeVisible();
    await expect(contributorPage.getByRole("link", { name: "Contributors" })).toHaveCount(0);

    await ownerContext.close();
    await contributorContext.close();
  } finally {
    if (workspaceId) {
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
    if (contributorUserId) await db.user.delete({ where: { id: contributorUserId } });
    await db.$disconnect();
  }
});
