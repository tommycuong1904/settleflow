import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { listAccessiblePayouts, getPayoutDetail } from "@/lib/repositories/payouts";
import { POST as submitRoute } from "@/app/api/v1/milestones/[id]/submit/route";

const wallet = "0x7777777777777777777777777777777777777777";

test("contributors cannot view or submit a draft payout, then gain access only after activation", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const contributorEmail = `draft-contributor-${suffix}@example.test`;
  const owner = await db.user.create({ data: { displayName: "Draft Owner", email: `draft-owner-${suffix}@example.test` } });
  const contributorUser = await db.user.create({ data: { displayName: "Draft Contributor", email: contributorEmail } });
  const workspace = await db.workspace.create({ data: { name: "Draft Access Workspace", slug: `draft-access-${suffix}` } });
  await db.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: owner.id, role: "owner" },
    { workspaceId: workspace.id, userId: contributorUser.id, role: "contributor" },
  ] });
  const contributor = await db.contributor.create({
    data: { workspaceId: workspace.id, createdByUserId: owner.id, linkedUserId: contributorUser.id, name: "Draft Contributor", walletAddress: wallet },
  });
  const payout = await db.payout.create({
    data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: owner.id, title: "Hidden draft", totalAmountUsdc: "5", status: "draft", targetWalletAddress: wallet },
  });
  const milestone = await db.milestone.create({
    data: { payoutId: payout.id, title: "Draft milestone", description: "Must not submit", amountUsdc: "5", sequence: 1, status: "pending" },
  });
  const token = await createSessionToken({ userId: contributorUser.id, email: contributorEmail, name: contributorUser.displayName, address: null, authType: "web2_google" });
  const params = { params: Promise.resolve({ id: milestone.id }) };

  try {
    const draftList = await listAccessiblePayouts({
      userId: contributorUser.id,
      memberships: [{ workspaceId: workspace.id, role: "contributor" }],
    });
    assert.equal(draftList.length, 0);
    assert.equal(await getPayoutDetail(payout.id, workspace.id, { linkedUserId: contributorUser.id }), null);

    const draftSubmit = await submitRoute(new Request(`https://settleflow.local/api/v1/milestones/${milestone.id}/submit?workspaceId=${workspace.id}`, {
      method: "POST",
      headers: { cookie: `sf_session=${token}`, "content-type": "application/json" },
      body: JSON.stringify({ summary: "Attempt before activation" }),
    }), params);
    assert.equal(draftSubmit.status, 409);
    assert.equal((await draftSubmit.json()).code, "PAYOUT_NOT_ACTIVE");
    assert.equal(await db.milestoneSubmission.count({ where: { milestoneId: milestone.id } }), 0);

    await db.payout.update({ where: { id: payout.id }, data: { status: "active" } });
    const activeList = await listAccessiblePayouts({
      userId: contributorUser.id,
      memberships: [{ workspaceId: workspace.id, role: "contributor" }],
    });
    assert.deepEqual(activeList.map((item) => item.id), [payout.id]);
    assert.ok(await getPayoutDetail(payout.id, workspace.id, { linkedUserId: contributorUser.id }));

    const activeSubmit = await submitRoute(new Request(`https://settleflow.local/api/v1/milestones/${milestone.id}/submit?workspaceId=${workspace.id}`, {
      method: "POST",
      headers: { cookie: `sf_session=${token}`, "content-type": "application/json" },
      body: JSON.stringify({ summary: "Submit after activation" }),
    }), params);
    assert.equal(activeSubmit.status, 201);
  } finally {
    await db.activityLog.deleteMany({ where: { payoutId: payout.id } });
    await db.milestoneSubmission.deleteMany({ where: { milestoneId: milestone.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, contributorUser.id] } } });
  }
});
