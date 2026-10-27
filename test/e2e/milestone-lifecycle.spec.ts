import { expect, test } from "@playwright/test";

import { createSessionToken } from "@/lib/auth/session";
import { createTestPrismaClient } from "@/test/support/test-db";

const enabled = Boolean(process.env.SETTLEFLOW_TEST_DATABASE_URL);
test.skip(!enabled, "requires SETTLEFLOW_TEST_DATABASE_URL");

test("contributor can revise submitted work and owner can approve the resubmission", async ({ browser }) => {
  test.setTimeout(60_000);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = createTestPrismaClient();
  let workspaceId = "";
  let payoutId = "";
  let ownerId = "";
  let contributorUserId = "";
  let ownerContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  let contributorContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  try {
    const owner = await db.user.create({ data: { displayName: "Lifecycle Owner", email: `lifecycle-owner-${suffix}@example.test` } });
    const contributorUser = await db.user.create({ data: { displayName: "Lifecycle Contributor", email: `lifecycle-contributor-${suffix}@example.test` } });
    ownerId = owner.id;
    contributorUserId = contributorUser.id;
    const workspace = await db.workspace.create({ data: { name: "Lifecycle Workspace", slug: `lifecycle-${suffix}` } });
    workspaceId = workspace.id;
    await db.workspaceMember.createMany({ data: [
      { workspaceId, userId: owner.id, role: "owner" },
      { workspaceId, userId: contributorUser.id, role: "contributor" },
    ] });
    const contributor = await db.contributor.create({
      data: { workspaceId, linkedUserId: contributorUser.id, createdByUserId: owner.id, name: "Lifecycle Contributor" },
    });
    const payout = await db.payout.create({
      data: { workspaceId, contributorId: contributor.id, createdByUserId: owner.id, title: "Lifecycle payout", totalAmountUsdc: "10", status: "active" },
    });
    payoutId = payout.id;
    await db.milestone.create({
      data: { payoutId, title: "Lifecycle milestone", description: "Deliver revised work", amountUsdc: "10", sequence: 1 },
    });

    const ownerToken = await createSessionToken(
      { userId: owner.id, email: owner.email!, name: owner.displayName, address: null, authType: "web2_google" },
      "e2e-test-session-secret",
    );
    const contributorToken = await createSessionToken(
      { userId: contributorUser.id, email: contributorUser.email!, name: contributorUser.displayName, address: null, authType: "web2_google" },
      "e2e-test-session-secret",
    );
    ownerContext = await browser.newContext();
    contributorContext = await browser.newContext();
    await ownerContext.addCookies([
      { name: "sf_session", value: ownerToken, domain: "127.0.0.1", path: "/" },
      { name: "sf_workspace_id", value: workspaceId, domain: "127.0.0.1", path: "/" },
    ]);
    await contributorContext.addCookies([
      { name: "sf_session", value: contributorToken, domain: "127.0.0.1", path: "/" },
      { name: "sf_workspace_id", value: workspaceId, domain: "127.0.0.1", path: "/" },
    ]);

    const contributorPage = await contributorContext.newPage();
    await contributorPage.goto(`/payouts/${payoutId}?workspaceId=${workspaceId}`);
    await contributorPage.getByRole("button", { name: "Submit work for review" }).click();
    await contributorPage.getByLabel(/What did you complete/).fill("Initial delivery for review.");
    const submitResponse = contributorPage.waitForResponse((response) =>
      response.request().method() === "POST" && response.url().includes("/submit"),
    );
    await contributorPage.getByRole("button", { name: "Submit for Review" }).click();
    await expect((await submitResponse).status()).toBe(201);
    await expect.poll(async () => (await db.milestone.findFirst({ where: { payoutId }, select: { status: true } }))?.status).toBe("submitted");

    const ownerPage = await ownerContext.newPage();
    await ownerPage.goto(`/payouts/${payoutId}?workspaceId=${workspaceId}`);
    await ownerPage.getByRole("button", { name: "Request changes" }).click();
    await ownerPage.getByLabel("Feedback").fill("Please add the final source files before approval.");
    const rejectResponse = ownerPage.waitForResponse((response) =>
      response.request().method() === "POST" && response.url().includes("/reject"),
    );
    await ownerPage.getByRole("button", { name: "Send Revision Request" }).click();
    await expect((await rejectResponse).status()).toBe(200);
    await expect.poll(async () => (await db.milestone.findFirst({ where: { payoutId }, select: { status: true } }))?.status).toBe("rejected");
    await expect(ownerPage.getByText("Revision requested")).toBeVisible();

    await contributorPage.reload();
    await expect(contributorPage.getByText("Revision requested").first()).toBeVisible();
    await expect(contributorPage.getByText("Owner feedback").first()).toBeVisible();
    await expect(contributorPage.getByText("Please add the final source files before approval.").first()).toBeVisible();
    await contributorPage.getByRole("button", { name: "Resubmit work" }).first().click();
    await expect(contributorPage.getByText("Update and resubmit")).toBeVisible();
    await contributorPage.getByLabel(/What did you change/).fill("Updated delivery includes the final source files.");
    const resubmitResponse = contributorPage.waitForResponse((response) =>
      response.request().method() === "POST" && response.url().includes("/submit"),
    );
    await contributorPage.getByRole("button", { name: "Resubmit for Review" }).click();
    await expect((await resubmitResponse).status()).toBe(201);
    await expect.poll(async () => (await db.milestone.findFirst({ where: { payoutId }, select: { status: true } }))?.status).toBe("submitted");

    await ownerPage.reload();
    const approveResponse = ownerPage.waitForResponse((response) =>
      response.request().method() === "POST" && response.url().includes("/approve"),
    );
    await ownerPage.getByRole("button", { name: "Approve work" }).click();
    await expect((await approveResponse).status()).toBe(200);
    await expect.poll(async () => (await db.milestone.findFirst({ where: { payoutId }, select: { status: true } }))?.status).toBe("approved");

    const milestone = await db.milestone.findFirst({ where: { payoutId }, select: { status: true } });
    expect(milestone?.status).toBe("approved");
    expect(await db.milestoneSubmission.count({ where: { milestone: { payoutId } } })).toBe(2);
  } finally {
    await ownerContext?.close();
    await contributorContext?.close();
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
