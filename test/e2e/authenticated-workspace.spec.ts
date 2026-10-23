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
  let emptyContributorWorkspaceId = "";
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
    const noWalletContributor = await db.contributor.create({ data: { workspaceId, createdByUserId: owner.id, name: "No-wallet Contributor", walletAddress: null } });
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
    await ownerPage.goto(`/payouts/new?workspaceId=${workspaceId}`);
    await ownerPage.getByLabel("Payout title").fill("No-wallet browser payout");
    await ownerPage.getByRole("combobox").click();
    await ownerPage.getByText("No-wallet Contributor · active").click();
    await expect(ownerPage.getByLabel("Wallet address")).toHaveValue("");
    await ownerPage.getByRole("button", { name: "Continue to payment plan" }).click();
    await ownerPage.getByRole("button", { name: "Review payout" }).click();
    await ownerPage.getByRole("button", { name: "Create payout" }).click();
    await expect(ownerPage).toHaveURL(/\/payouts\//);
    await expect(ownerPage.getByText("Choose a method when paying")).toBeVisible();
    await ownerPage.getByRole("button", { name: "Activate payout" }).click();
    await expect(ownerPage.getByText("In progress")).toBeVisible();
    const noWalletPayout = await db.payout.findFirst({ where: { workspaceId, contributorId: noWalletContributor.id }, select: { targetWalletAddress: true, status: true } });
    expect(noWalletPayout).toEqual({ targetWalletAddress: null, status: "active" });
    await ownerPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await expect(ownerPage.getByRole("button", { name: "Submit milestone" })).toHaveCount(0);

    const contributorPage = await contributorContext.newPage();
    await contributorPage.goto(`/payouts?workspaceId=${workspaceId}`);
    await expect(contributorPage.getByRole("link", { name: "Payouts" })).toBeVisible();
    await expect(contributorPage.getByText("Browser-scoped payout")).toBeVisible();
    await expect(contributorPage.getByRole("link", { name: "New Payout" })).toHaveCount(0);
    await contributorPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await contributorPage.getByRole("button", { name: "Submit milestone" }).click();
    await contributorPage.getByPlaceholder("https://github.com/org/repo/pull/123").fill("https://example.test/e2e-proof");
    await contributorPage.getByLabel(/What did you complete/).fill("Browser evidence submitted by the assigned contributor.");
    await contributorPage.getByRole("button", { name: "Submit for Review" }).click();
    await expect(contributorPage.getByText("Submitted • Awaiting workspace owner review")).toBeVisible();

    await ownerPage.reload();
    await ownerPage.goto(`/notifications?workspaceId=${workspaceId}`);
    await expect(ownerPage.getByRole("main").getByText("Milestone ready for review")).toBeVisible();
    await ownerPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await expect(ownerPage.getByText("1 milestone awaiting your review.")).toBeVisible();
    await expect(ownerPage.getByRole("heading", { name: "Payment action" })).toHaveCount(0);
    await expect(ownerPage.getByText("No payment action needed")).toHaveCount(0);
    await ownerPage.getByRole("button", { name: "Approve Milestone" }).click();
    await expect(ownerPage.getByText("Ready to pay")).toBeVisible();
    await expect(ownerPage.getByRole("heading", { name: "Payment action" })).toHaveCount(0);
    await expect(ownerPage.getByRole("button", { name: "Pay 100 USDC" })).toBeVisible();
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await ownerPage.getByRole("button", { name: "Pay 100 USDC" }).first().click();
    await expect(ownerPage.getByRole("heading", { name: "Choose how to record this payment" })).toBeVisible();
    await ownerPage.getByRole("button", { name: "Simulated payment" }).click();
    await expect(ownerPage.getByRole("heading", { name: "Mark this milestone as paid?" })).toBeVisible();
    await expect(ownerPage.getByText("No funds will move")).toBeVisible();
    await ownerPage.getByRole("button", { name: "Mark as paid (demo)" }).click();
    await expect(ownerPage.getByLabel("Notifications").getByText("Payment recorded for testing")).toBeVisible();
    await ownerPage.getByRole("button", { name: "Export Payout Summary" }).click();
    await expect(ownerPage.getByText("Payment summary")).toBeVisible();
    await expect(ownerPage.getByText("Simulated payment (test)")).toBeVisible();
    await expect(ownerPage.getByRole("main").getByText("Payment recorded for testing")).toBeVisible();
    await expect(ownerPage.getByText("USDC on Arc Testnet")).toHaveCount(0);
    await ownerPage.getByLabel("Close modal").click();

    await contributorPage.reload();
    await expect(contributorPage.getByRole("main").getByText("1 of 1 paid")).toBeVisible();
    await expect(contributorPage.getByRole("heading", { name: "Payment action" })).toHaveCount(0);
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
    await contributorPage.reload();
    await expect(contributorPage.getByRole("button", { name: /Acme delivery work/i })).toBeVisible();
    await expect(contributorPage.getByRole("link", { name: "Contributors" })).toHaveCount(0);

    const emptyContributorWorkspace = await db.workspace.create({ data: { name: "E2E Empty Contributor Workspace", slug: `e2e-empty-contributor-${suffix}` } });
    emptyContributorWorkspaceId = emptyContributorWorkspace.id;
    await db.workspaceMember.create({ data: { workspaceId: emptyContributorWorkspaceId, userId: contributorUser.id, role: "contributor" } });
    await contributorContext.addCookies([{ name: "sf_workspace_id", value: emptyContributorWorkspaceId, domain: "127.0.0.1", path: "/" }]);
    await contributorPage.goto("/payouts");
    await expect(contributorPage.getByText("See the work assigned to you and submit it when it is ready.")).toBeVisible();
    await expect(contributorPage.getByText("No payouts assigned yet")).toBeVisible();
    await expect(contributorPage.getByText("Payouts assigned to you will appear here after a workspace owner creates one.")).toBeVisible();
    await expect(contributorPage.getByRole("link", { name: "New Payout" })).toHaveCount(0);

    await ownerContext.close();
    await contributorContext.close();
  } finally {
    if (workspaceId) {
      await db.paymentAttempt.deleteMany({ where: { payout: { workspaceId } } });
      await db.payout.deleteMany({ where: { workspaceId } });
      await db.contributor.deleteMany({ where: { workspaceId } });
      await db.workspaceMember.deleteMany({ where: { workspaceId } });
      await db.workspace.delete({ where: { id: workspaceId } });
    }
    if (personalWorkspaceId) {
      await db.workspaceMember.deleteMany({ where: { workspaceId: personalWorkspaceId } });
      await db.workspace.delete({ where: { id: personalWorkspaceId } });
    }
    if (emptyContributorWorkspaceId) {
      await db.workspaceMember.deleteMany({ where: { workspaceId: emptyContributorWorkspaceId } });
      await db.workspace.delete({ where: { id: emptyContributorWorkspaceId } });
    }
    if (ownerId) await db.user.delete({ where: { id: ownerId } });
    if (contributorUserId) await db.user.delete({ where: { id: contributorUserId } });
    await db.$disconnect();
  }
});
