import { expect, test } from "@playwright/test";
import { createSessionToken } from "@/lib/auth/session";
import { createTestPrismaClient } from "@/test/support/test-db";

const enabled = Boolean(process.env.SETTLEFLOW_TEST_DATABASE_URL);
test.skip(!enabled, "requires SETTLEFLOW_TEST_DATABASE_URL");

test("owner and contributor payout views are scoped to their workspace", async ({ browser }) => {
  test.setTimeout(120_000);
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
    const payout = await db.payout.create({ data: { workspaceId, contributorId: contributor.id, createdByUserId: owner.id, title: "Browser-scoped payout", totalAmountUsdc: "100", status: "draft" } });
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
    await ownerPage.getByRole("button", { name: "Continue to milestones" }).click();
    await ownerPage.getByLabel("Milestone 1 title").fill("No-wallet milestone");
    await ownerPage.getByLabel("Milestone 1 amount in USDC").fill("0.1");
    await ownerPage.getByLabel("Milestone 1 description").fill("A milestone without a wallet payment address.");
    await ownerPage.getByRole("button", { name: "Review payout" }).click();
    await ownerPage.getByRole("button", { name: "Save payout draft" }).click();
    await expect(ownerPage).toHaveURL(/\/payouts\//);
    await expect(ownerPage.getByRole("main").getByText("Ready to activate").first()).toBeVisible();
    await ownerPage.getByLabel("Draft payout title").fill("Reviewed no-wallet browser payout");
    await expect(ownerPage.getByText("Complete these steps")).toBeVisible();
    const saveDraftResponse = ownerPage.waitForResponse((response) =>
      response.request().method() === "PATCH" && response.url().includes(`/api/v1/payouts/`),
    );
    await ownerPage.getByRole("button", { name: "Save draft details" }).click();
    await expect((await saveDraftResponse).status()).toBe(200);
    await expect(ownerPage.getByRole("button", { name: "Activate payout" })).toBeEnabled();
    const activateResponse = ownerPage.waitForResponse((response) =>
      response.request().method() === "POST" && response.url().includes(`/api/v1/payouts/`) && response.url().endsWith("/activate"),
    );
    await ownerPage.getByRole("button", { name: "Activate payout" }).click();
    await expect((await activateResponse).status()).toBe(200);
    await expect.poll(async () => db.payout.findFirst({ where: { workspaceId, contributorId: noWalletContributor.id }, select: { targetWalletAddress: true, status: true } })).toEqual({ targetWalletAddress: null, status: "active" });
    await ownerPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await expect(ownerPage.getByRole("main").getByText("Ready to activate").first()).toBeVisible();
    await ownerPage.getByRole("button", { name: "Activate payout" }).click();
    await expect(ownerPage.getByText("Payout is live").first()).toBeVisible();
    await expect(ownerPage.getByRole("button", { name: "Submit milestone" })).toHaveCount(0);

    const contributorPage = await contributorContext.newPage();
    await contributorPage.goto(`/payouts?workspaceId=${workspaceId}`);
    await expect(contributorPage.getByRole("link", { name: "Payouts" })).toBeVisible();
    await expect(contributorPage.getByText("Browser-scoped payout")).toBeVisible();
    await expect(contributorPage.getByRole("link", { name: "New Payout" })).toHaveCount(0);
    await contributorPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await expect(contributorPage.getByRole("main").getByText("Your next step")).toBeVisible();
    await expect(contributorPage.getByRole("main").getByText("Submit your work, respond to feedback, and track payment progress.")).toBeVisible();
    await expect(contributorPage.getByText("Payment setup")).toHaveCount(0);
    await expect(contributorPage.getByRole("button", { name: "Payment summary" })).toBeVisible();
    await expect(contributorPage.getByRole("paragraph").filter({ hasText: "Ready for your work" })).toBeVisible();
    await expect(contributorPage.getByRole("button", { name: "Submit work for review" })).toHaveCount(1);
    await contributorPage.goto(`/dashboard?workspaceId=${workspaceId}`);
    await expect(contributorPage.getByRole("heading", { name: "Submit Browser milestone" })).toBeVisible();
    const submitWorkLink = contributorPage.getByRole("link", { name: "Submit work" });
    await expect(submitWorkLink).toHaveAttribute("href", `/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await submitWorkLink.click();
    await expect(contributorPage).toHaveURL(new RegExp(`/payouts/${payout.id}\\?workspaceId=${workspaceId}`));
    await expect(contributorPage.getByRole("button", { name: "Submit work for review" })).toBeVisible();
    await contributorPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await contributorPage.setViewportSize({ width: 390, height: 844 });
    await contributorPage.getByRole("button", { name: "Submit work for review" }).click();
    await expect(contributorPage.getByRole("dialog", { name: "Browser milestone" })).toBeVisible();
    await expect.poll(() => contributorPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect.poll(() => contributorPage.getByRole("dialog").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await contributorPage.getByPlaceholder("https://github.com/org/repo/pull/123").fill("https://example.test/e2e-proof");
    await contributorPage.getByLabel(/What did you complete/).fill("Browser evidence submitted by the assigned contributor.");
    await contributorPage.getByRole("button", { name: "Submit for Review" }).click();
    await expect(contributorPage.getByText("Awaiting review").first()).toBeVisible();

    await ownerPage.reload();
    await ownerPage.goto(`/dashboard?workspaceId=${workspaceId}`);
    const reviewWorkLink = ownerPage.getByRole("link", { name: "Review work" });
    await expect(reviewWorkLink).toHaveAttribute("href", `/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await reviewWorkLink.click();
    await expect(ownerPage).toHaveURL(new RegExp(`/payouts/${payout.id}\\?workspaceId=${workspaceId}`));
    await ownerPage.goto(`/notifications?workspaceId=${workspaceId}`);
    await expect(ownerPage.getByRole("main").getByText("Milestone ready for review")).toBeVisible();
    await ownerPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await expect(ownerPage.getByRole("main").getByText("1 milestone awaiting your review.")).toBeVisible();
    await expect(ownerPage.getByText("Review Browser milestone").first()).toBeVisible();
    await expect(ownerPage.getByRole("link", { name: "Review work" })).toBeVisible();
    await expect(ownerPage.getByRole("heading", { name: "Payment action" })).toHaveCount(0);
    await expect(ownerPage.getByText("No payment action needed")).toHaveCount(0);
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await ownerPage.getByRole("button", { name: "Request changes" }).click();
    await expect(ownerPage.getByRole("dialog", { name: /Request changes to .*Browser milestone/ })).toBeVisible();
    await expect.poll(() => ownerPage.getByRole("dialog").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await ownerPage.getByLabel("Close dialog").click();
    await ownerPage.getByRole("button", { name: "Approve work" }).click();
    await expect(ownerPage.getByText("Ready to pay").first()).toBeVisible();
    await expect(ownerPage.getByText(/Pay 100 USDC to .*You’ll review the details before payment begins\./)).toBeVisible();
    await expect(ownerPage.getByRole("heading", { name: "Payment action" })).toHaveCount(0);
    await expect(ownerPage.getByRole("button", { name: "Pay 100 USDC" })).toBeVisible();
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => ownerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await ownerPage.getByRole("button", { name: "Pay 100 USDC" }).first().click();
    await expect(ownerPage.getByRole("heading", { name: "Choose how to record this payment" })).toBeVisible();
    await expect(ownerPage.getByRole("button", { name: /Wallet payment/ })).toBeEnabled();
    await ownerPage.getByRole("button", { name: "Simulated payment" }).click();
    await expect(ownerPage.getByRole("heading", { name: "Mark this milestone as paid?" })).toBeVisible();
    await expect(ownerPage.getByText("No funds will move")).toBeVisible();
    await ownerPage.getByRole("button", { name: "Mark as paid (demo)" }).click();
    await expect(ownerPage.getByLabel("Notifications").getByText("Payment recorded for testing")).toBeVisible();
    await expect(ownerPage.getByText("Simulated · no funds moved")).toBeVisible();
    await ownerPage.getByRole("button", { name: "Payment summary" }).click();
    await expect(ownerPage.getByText("Payment summary").first()).toBeVisible();
    await expect(ownerPage.getByText("Simulated payment (test)")).toBeVisible();
    await expect(ownerPage.getByRole("main").getByText("Payment recorded for testing")).toBeVisible();
    await expect(ownerPage.getByText("USDC on Arc Testnet")).toHaveCount(0);
    await ownerPage.getByLabel("Close modal").click();
    await ownerPage.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}&receipt=payment`);
    await expect(ownerPage.getByText("Payment summary")).toBeVisible();
    await ownerPage.getByLabel("Close modal").click();

    await contributorPage.reload();
    await expect(contributorPage.getByRole("main").getByText("1 of 1 paid")).toBeVisible();
    await expect(contributorPage.getByRole("heading", { name: "Payment action" })).toHaveCount(0);
    await expect(contributorPage.getByRole("button", { name: "Release Payout" })).toHaveCount(0);
    await contributorPage.goto(`/notifications?workspaceId=${workspaceId}`);
    await expect(contributorPage.getByRole("button", { name: "Unread Milestone approved" })).toContainText("View approval");

    await contributorPage.setViewportSize({ width: 1280, height: 900 });
    await contributorPage.goto("/dashboard");
    await expect(contributorPage.getByText("CURRENT WORKSPACE")).toBeVisible();
    await expect(contributorPage.getByText("NAVIGATION")).toBeVisible();
    await expect(contributorPage.getByRole("button", { name: /Client design work/i })).toBeVisible();
    await expect(contributorPage.getByRole("link", { name: "Contributors" })).toHaveCount(0);
    await expect(contributorPage.getByRole("link", { name: "New Payout" })).toHaveCount(0);
    await contributorPage.getByRole("button", { name: /Client design work/i }).click();
    await contributorPage.getByRole("button", { name: /Rename Client design work for me/i }).click();
    await contributorPage.getByLabel("Label for you").fill("Acme delivery work");
    await contributorPage.getByRole("button", { name: "Save label" }).click();
    await expect(contributorPage.getByRole("button", { name: /^Acme delivery work contributor/i })).toBeVisible();
    await Promise.all([
      contributorPage.waitForNavigation({ waitUntil: "domcontentloaded" }),
      contributorPage.getByRole("menuitem", { name: /E2E Personal Workspace/i }).click(),
    ]);
    await expect(contributorPage).toHaveURL(/\/dashboard$/);
    await expect(contributorPage.getByRole("button", { name: /E2E Personal Workspace owner/i })).toBeVisible();
    await contributorPage.reload();
    await expect(contributorPage.getByRole("button", { name: /E2E Personal Workspace/i })).toBeVisible();
    await expect(contributorPage.getByRole("link", { name: "Contributors" })).toBeVisible();

    await contributorPage.getByRole("button", { name: /E2E Personal Workspace/i }).click();
    await Promise.all([
      contributorPage.waitForNavigation({ waitUntil: "domcontentloaded" }),
      contributorPage.getByRole("menuitem", { name: /Acme delivery work/i }).click(),
    ]);
    await expect(contributorPage.getByRole("button", { name: /^Acme delivery work contributor/i })).toBeVisible();
    await contributorPage.reload();
    await expect(contributorPage.getByRole("button", { name: /Acme delivery work/i })).toBeVisible();
    await expect(contributorPage.getByRole("link", { name: "Contributors" })).toHaveCount(0);

    const emptyContributorWorkspace = await db.workspace.create({ data: { name: "E2E Empty Contributor Workspace", slug: `e2e-empty-contributor-${suffix}` } });
    emptyContributorWorkspaceId = emptyContributorWorkspace.id;
    await db.workspaceMember.create({ data: { workspaceId: emptyContributorWorkspaceId, userId: contributorUser.id, role: "contributor" } });
    await contributorPage.reload();
    await contributorPage.getByRole("button", { name: /Acme delivery work/i }).click();
    await Promise.all([
      contributorPage.waitForNavigation({ waitUntil: "domcontentloaded" }),
      contributorPage.getByRole("menuitem", { name: /E2E Empty Contributor Workspace/i }).click(),
    ]);
    await expect(contributorPage.getByRole("button", { name: /E2E Empty Contributor Workspace contributor/i })).toBeVisible();
    await contributorPage.reload();
    await expect(contributorPage.getByRole("button", { name: /E2E Empty Contributor Workspace contributor/i })).toBeVisible();
    await contributorPage.goto("/payouts");
    await expect(contributorPage.getByRole("main").getByText("See the work assigned to you and submit it when it is ready.")).toBeVisible();
    await expect(contributorPage.getByRole("main").getByText("No payouts assigned yet")).toBeVisible();
    await expect(contributorPage.getByRole("main").getByText("Your workspace owner will assign a payout when work is ready. You can then review the scope and submit work here — no wallet setup is needed.")).toBeVisible();
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

test("owner onboarding presents one clear next step on mobile", async ({ browser }) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = createTestPrismaClient();
  let workspaceId = "";
  let ownerId = "";
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  try {
    const owner = await db.user.create({ data: { displayName: "Onboarding Owner", email: `onboarding-owner-${suffix}@example.test` } });
    ownerId = owner.id;
    const workspace = await db.workspace.create({ data: { name: "Onboarding Workspace", slug: `onboarding-${suffix}` } });
    workspaceId = workspace.id;
    await db.workspaceMember.create({ data: { workspaceId, userId: owner.id, role: "owner" } });

    const token = await createSessionToken({ userId: owner.id, email: owner.email!, name: owner.displayName, address: null, authType: "web2_google" }, "e2e-test-session-secret");
    context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([
      { name: "sf_session", value: token, domain: "127.0.0.1", path: "/" },
      { name: "sf_workspace_id", value: workspaceId, domain: "127.0.0.1", path: "/" },
    ]);
    const page = await context.newPage();

    await page.goto("/dashboard");
    await expect(page.getByText("Step 1 of 2")).toBeVisible();
    await expect(page.getByRole("main").getByText("Add the first person you will pay.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Add your first contributor" })).toHaveAttribute("href", "/contributors");
    await expect(page.getByRole("heading", { name: "Your work queue" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Recent payments" })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.goto("/payouts/new");
    await expect(page.getByText("Add a contributor before creating a payout.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Add contributor" })).toHaveAttribute("href", new RegExp(`^/contributors\\?workspaceId=${workspaceId}&returnTo=`));
    await expect(page.getByRole("button", { name: "Continue to milestones" })).toBeDisabled();
    await page.getByRole("link", { name: "Add contributor" }).click();
    await expect(page).toHaveURL(/\/contributors\?/);
    await expect(page.getByRole("link", { name: "Back to Create payout" })).toBeVisible();
    await page.getByRole("button", { name: "Add Contributor", exact: true }).click();
    await page.getByPlaceholder("e.g. Alice Walker").fill("First contributor");
    await page.getByRole("button", { name: "Save Contributor" }).click();
    await expect(page.getByText("First contributor")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("Step 2 of 2")).toBeVisible();
    await expect(page.getByRole("main").getByText("Create your first payout.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create your first payout" })).toHaveAttribute("href", "/payouts/new");
    await expect(page.getByRole("heading", { name: "Your work queue" })).toHaveCount(0);
    await page.getByRole("link", { name: "Create your first payout" }).click();
    await expect(page.getByLabel("Payout title")).toBeVisible();
    await expect(page.getByLabel("Wallet address")).toHaveValue("");
    await page.getByLabel("Payout title").fill("First campaign payout");
    await page.getByRole("combobox", { name: /Contributor/ }).click();
    await page.getByText("First contributor · active").click();
    await page.getByRole("button", { name: "Continue to milestones" }).click();
    await page.getByLabel("Milestone 1 title").fill("Campaign concepts");
    await page.getByLabel("Milestone 1 amount in USDC").fill("0.1");
    await page.getByLabel("Milestone 1 description").fill("Create initial campaign concepts for review.");
    await page.getByRole("button", { name: "Add another milestone" }).click();
    await expect(page.getByLabel("Milestone 2 title")).toBeVisible();
    await page.getByLabel("Milestone 2 title").fill("Final campaign assets");
    await page.getByLabel("Milestone 2 amount in USDC").fill("0.2");
    await page.getByLabel("Milestone 2 description").fill("Deliver the selected campaign assets for handoff.");
    await expect(page.getByText("0.3 USDC total")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Review payout" }).click();
    await expect(page.getByRole("button", { name: "Save payout draft" })).toBeVisible();
    await page.getByRole("button", { name: "Save payout draft" }).click();
    await expect(page).toHaveURL(/\/payouts\//);
  } finally {
    await context?.close();
    if (workspaceId) {
      await db.payout.deleteMany({ where: { workspaceId } });
      await db.contributor.deleteMany({ where: { workspaceId } });
      await db.workspaceMember.deleteMany({ where: { workspaceId } });
      await db.workspace.delete({ where: { id: workspaceId } });
    }
    if (ownerId) await db.user.delete({ where: { id: ownerId } });
    await db.$disconnect();
  }
});

test("wallet payment is unavailable until a contributor has a wallet address", async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerAddress = `0x${crypto.randomUUID().replaceAll("-", "").padEnd(40, "1")}`;
  const db = createTestPrismaClient();
  let workspaceId = "";
  let ownerId = "";
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  try {
    const owner = await db.user.create({ data: { displayName: "Wallet-option Owner", email: `wallet-option-owner-${suffix}@example.test` } });
    ownerId = owner.id;
    const workspace = await db.workspace.create({ data: { name: "Wallet-option Workspace", slug: `wallet-option-${suffix}` } });
    workspaceId = workspace.id;
    await db.workspaceMember.create({ data: { workspaceId, userId: owner.id, role: "owner" } });
    const contributor = await db.contributor.create({ data: { workspaceId, createdByUserId: owner.id, name: "No-wallet Contributor", walletAddress: null } });
    const payout = await db.payout.create({ data: { workspaceId, contributorId: contributor.id, createdByUserId: owner.id, title: "No-wallet payment choice", totalAmountUsdc: "25", status: "active" } });
    await db.milestone.create({ data: { payoutId: payout.id, title: "Approved no-wallet milestone", description: "Check payment choices", amountUsdc: "25", sequence: 1, status: "approved", approvedAt: new Date() } });

    const token = await createSessionToken({ userId: owner.id, email: owner.email!, name: owner.displayName, address: ownerAddress, authType: "web3_wallet" }, "e2e-test-session-secret");
    context = await browser.newContext();
    await context.addCookies([{ name: "sf_session", value: token, domain: "127.0.0.1", path: "/" }]);
    const page = await context.newPage();

    await page.goto(`/payouts/${payout.id}?workspaceId=${workspaceId}`);
    await expect(page.getByText("Ready to pay").first()).toBeVisible();
    await page.getByRole("button", { name: "Pay 25 USDC" }).click();
    await expect(page.getByRole("dialog", { name: "Choose how to record this payment" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Wallet payment/ })).toBeDisabled();
    await expect(page.getByText("To use Wallet payment, add a wallet address to this contributor first.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Simulated payment" })).toBeEnabled();
  } finally {
    await context?.close();
    if (workspaceId) {
      await db.paymentAttempt.deleteMany({ where: { payout: { workspaceId } } });
      await db.payout.deleteMany({ where: { workspaceId } });
      await db.contributor.deleteMany({ where: { workspaceId } });
      await db.workspaceMember.deleteMany({ where: { workspaceId } });
      await db.workspace.delete({ where: { id: workspaceId } });
    }
    if (ownerId) await db.user.delete({ where: { id: ownerId } });
    await db.$disconnect();
  }
});
