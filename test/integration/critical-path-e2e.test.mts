import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { GET as getDashboard } from "@/app/api/dashboard/route";
import { POST as createPayout } from "@/app/api/v1/payouts/route";
import { GET as getPayoutDetail } from "@/app/api/v1/payouts/[id]/route";
import { POST as activatePayout } from "@/app/api/v1/payouts/[id]/activate/route";
import { POST as submitMilestone } from "@/app/api/v1/milestones/[id]/submit/route";
import { POST as approveMilestone } from "@/app/api/v1/milestones/[id]/approve/route";
import { POST as releaseMilestone } from "@/app/api/v1/milestones/[id]/release/route";
import { POST as proofRefreshRoute } from "@/app/api/v1/releases/[id]/proof/refresh/route";

const DESTINATION_WALLET = "0x9999999999999999999999999999999999999999";

function sessionCookie(token: string): string {
  return `sf_session=${token}`;
}

async function tokenFor(email: string, userId: string): Promise<string> {
  return createSessionToken({ userId, email, name: email, address: null, authType: "web2_google" });
}

test("E2E Smoke: Login -> Dashboard -> Create Payout -> Activate -> Submit -> Approve -> Release -> Proof", { skip: "Confirmation requires an independently verified Arc transaction; this suite must not submit real transactions." }, async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerEmail = `e2e-owner-${suffix}@example.com`;
  const reviewerEmail = `e2e-reviewer-${suffix}@example.com`;
  const contributorEmail = `e2e-contributor-${suffix}@example.com`;

  // 1. Setup Workspace & Multi-Role Users
  const owner = await db.user.create({ data: { displayName: "E2E Owner", email: ownerEmail } });
  const reviewer = await db.user.create({ data: { displayName: "E2E Reviewer", email: reviewerEmail } });
  const contributorUser = await db.user.create({ data: { displayName: "E2E Contributor", email: contributorEmail } });

  const workspace = await db.workspace.create({
    data: { name: "E2E Test Workspace", slug: `e2e-ws-${suffix}` },
  });

  await db.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: owner.id, role: "owner" },
      { workspaceId: workspace.id, userId: reviewer.id, role: "reviewer" },
      { workspaceId: workspace.id, userId: contributorUser.id, role: "contributor" },
    ],
  });

  const contributorRecord = await db.contributor.create({
    data: {
      workspaceId: workspace.id,
      linkedUserId: contributorUser.id,
      createdByUserId: owner.id,
      name: "E2E Contributor Profile",
      walletAddress: DESTINATION_WALLET,
      status: "active",
    },
  });

  const ownerToken = await tokenFor(ownerEmail, owner.id);
  const reviewerToken = await tokenFor(reviewerEmail, reviewer.id);
  const contributorToken = await tokenFor(contributorEmail, contributorUser.id);

  const ownerHeaders = { cookie: sessionCookie(ownerToken), "content-type": "application/json" };
  const reviewerHeaders = { cookie: sessionCookie(reviewerToken), "content-type": "application/json" };
  const contributorHeaders = { cookie: sessionCookie(contributorToken), "content-type": "application/json" };

  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  let createdPayoutId: string | null = null;
  let milestoneId: string | null = null;
  let releaseId: string | null = null;

  try {
    // 2. Dashboard Resolution (Happy Path)
    const dashboardRes = await getDashboard(
      new Request(`https://settleflow.local/api/dashboard?workspaceId=${workspace.id}`, {
        headers: { cookie: sessionCookie(ownerToken) },
      }),
    );
    assert.equal(dashboardRes.status, 200);
    const dashboardData = await dashboardRes.json();
    assert.ok(dashboardData.stats && typeof dashboardData.stats.activePayouts === "number");

    // 3. Create Payout (Draft state) - Owner Action
    const createRes = await createPayout(
      new Request(`https://settleflow.local/api/v1/payouts?workspaceId=${workspace.id}`, {
        method: "POST",
        headers: ownerHeaders,
        body: JSON.stringify({
          title: `E2E Payout Agreement ${suffix}`,
          contributorId: contributorRecord.id,
          targetWalletAddress: DESTINATION_WALLET,
          totalAmountUsdc: "100",
          milestones: [
            {
              title: "E2E Deliverable Alpha",
              description: "Build smoke suite verification artifact",
              amountUsdc: "100",
              sequence: 1,
            },
          ],
        }),
      }),
    );
    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    createdPayoutId = createBody.data?.id || createBody.payout?.id;
    assert.ok(createdPayoutId, "Payout ID should be generated");

    // Verify Payout is Draft
    const detailDraftRes = await getPayoutDetail(
      new Request(`https://settleflow.local/api/v1/payouts/${createdPayoutId}?workspaceId=${workspace.id}`, {
        headers: ownerHeaders,
      }),
      params(createdPayoutId),
    );
    assert.equal(detailDraftRes.status, 200);
    const draftData = await detailDraftRes.json();
    assert.equal(draftData.data.payout.status, "draft");
    milestoneId = draftData.data.milestones[0].id;
    assert.ok(milestoneId, "Milestone ID should exist");
    assert.equal(draftData.data.milestones[0].status, "pending");

    // 4. Activate Payout - Owner Action
    const activateRes = await activatePayout(
      new Request(`https://settleflow.local/api/v1/payouts/${createdPayoutId}/activate?workspaceId=${workspace.id}`, {
        method: "POST",
        headers: ownerHeaders,
      }),
      params(createdPayoutId),
    );
    assert.equal(activateRes.status, 200);
    const activateData = await activateRes.json();
    assert.equal(activateData.payout.status, "active");

    // 5. Submit Milestone - Contributor Action (with artifact & summary)
    const submitRes = await submitMilestone(
      new Request(`https://settleflow.local/api/v1/milestones/${milestoneId}/submit?workspaceId=${workspace.id}`, {
        method: "POST",
        headers: contributorHeaders,
        body: JSON.stringify({
          summary: "E2E deliverables ready for review",
          artifactUrl: "https://github.com/settleflow/repo/pull/1",
        }),
      }),
      params(milestoneId),
    );
    assert.equal(submitRes.status, 201);
    const submitData = await submitRes.json();
    assert.equal(submitData.milestone.status, "submitted");

    // 6. Review & Approve Milestone - Reviewer Action
    const approveRes = await approveMilestone(
      new Request(`https://settleflow.local/api/v1/milestones/${milestoneId}/approve?workspaceId=${workspace.id}`, {
        method: "POST",
        headers: reviewerHeaders,
      }),
      params(milestoneId),
    );
    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.equal(approveData.milestone.status, "approved");

    // 7. Queue Release - Owner Action (Fail-closed & mode-aware)
    const releaseRes = await releaseMilestone(
      new Request(`https://settleflow.local/api/v1/milestones/${milestoneId}/release?workspaceId=${workspace.id}`, {
        method: "POST",
        headers: ownerHeaders,
        body: JSON.stringify({
          amountUsdc: "100",
          executionMode: "browser_wallet",
        }),
      }),
      params(milestoneId),
    );
    assert.equal(releaseRes.status, 201);
    const releaseData = await releaseRes.json();
    assert.equal(releaseData.release.status, "queued");
    releaseId = releaseData.release.id;
    assert.ok(releaseId, "Release record ID must be returned");

    // 8. Settlement Proof Confirmation - Owner Action
    const proofRes = await proofRefreshRoute(
      new Request(`https://settleflow.local/api/v1/releases/${releaseId}/proof/refresh?workspaceId=${workspace.id}`, {
        method: "POST",
        headers: ownerHeaders,
        body: JSON.stringify({
          status: "confirmed",
          txHash: `0x${"e2".repeat(32)}`,
          network: "Arc Testnet",
          explorerUrl: `https://testnet.arcscan.app/tx/0x${"e2".repeat(32)}`,
        }),
      }),
      params(releaseId),
    );
    assert.equal(proofRes.status, 200);
    const proofData = await proofRes.json();
    assert.equal(proofData.release.status, "confirmed");

    // 9. Verify Final State Transitions on Payout & Milestone
    const finalDetailRes = await getPayoutDetail(
      new Request(`https://settleflow.local/api/v1/payouts/${createdPayoutId}?workspaceId=${workspace.id}`, {
        headers: ownerHeaders,
      }),
      params(createdPayoutId),
    );
    assert.equal(finalDetailRes.status, 200);
    const finalData = await finalDetailRes.json();
    assert.equal(finalData.data.payout.status, "completed");
    assert.equal(finalData.data.milestones[0].status, "released");
    assert.ok(finalData.data.releaseProof, "Transaction proof must be attached to completed payout");
    assert.equal(finalData.data.releaseProof.status, "confirmed");
    assert.equal(finalData.data.releaseProof.txHash, `0x${"e2".repeat(32)}`);
  } finally {
    // 10. Clean Up Test Entities
    if (createdPayoutId) {
      await db.transactionProof.deleteMany({ where: { payoutId: createdPayoutId } });
      await db.release.deleteMany({ where: { payoutId: createdPayoutId } });
      await db.milestoneReview.deleteMany({ where: { milestone: { payoutId: createdPayoutId } } });
      await db.milestoneSubmission.deleteMany({ where: { milestone: { payoutId: createdPayoutId } } });
      await db.milestone.deleteMany({ where: { payoutId: createdPayoutId } });
      await db.payout.deleteMany({ where: { id: createdPayoutId } });
    }
    await db.contributor.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, reviewer.id, contributorUser.id] } } });
  }
});
