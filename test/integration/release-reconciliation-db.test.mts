import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

const wallet = "0x4444444444444444444444444444444444444444";

test("pending execution result without errorMessage enters reconciliation (HTTP 202), never the success/201 path", async () => {
  process.env.NEXT_PUBLIC_ARC_EXECUTION_MODE = "mock";
  const moduleUrl =
    new URL("../../app/api/v1/milestones/[id]/release/route.ts", import.meta.url).href +
    `?gate=${Date.now()}`;
  const { POST: releaseRoute } = (await import(moduleUrl)) as {
    POST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
  };

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `recon-owner-${suffix}@example.com`;
  const user = await db.user.create({
    data: { displayName: "Recon Owner", email },
  });
  const workspace = await db.workspace.create({
    data: { name: "Recon Workspace", slug: `recon-${suffix}` },
  });
  await db.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: "owner" },
  });
  const contributor = await db.contributor.create({
    data: {
      workspaceId: workspace.id,
      createdByUserId: user.id,
      name: "Recon Contributor",
      walletAddress: wallet,
    },
  });
  const payout = await db.payout.create({
    data: {
      workspaceId: workspace.id,
      contributorId: contributor.id,
      createdByUserId: user.id,
      title: "Recon Payout",
      totalAmountUsdc: "5",
      status: "active",
      targetWalletAddress: wallet,
    },
  });
  const milestone = await db.milestone.create({
    data: {
      payoutId: payout.id,
      title: "Recon Milestone",
      description: "Recon test",
      amountUsdc: "5",
      sequence: 1,
      status: "approved",
    },
  });
  const token = await createSessionToken({
    userId: user.id,
    email,
    name: "Recon Owner",
    address: null,
    authType: "web2_google",
  });
  const headers = { cookie: `sf_session=${token}` };
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  try {
    const response = await releaseRoute(
      new Request(
        `https://settleflow.local/api/v1/milestones/${milestone.id}/release?workspaceId=${workspace.id}&actor=owner`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            amountUsdc: "5",
            executionMode: "circle_wallet",
            ownerUserId: user.id,
          }),
        },
      ),
      params(milestone.id),
    );

    assert.equal(response.status, 202);
    const body = (await response.json()) as {
      releaseId: string;
      proofId: string;
      status: string;
    };
    assert.equal(body.status, "pending");

    const release = await db.release.findUnique({
      where: { id: body.releaseId },
      select: { status: true, failureReason: true },
    });
    assert.equal(release?.status, "pending");
    assert.ok(release?.failureReason);

    const proof = await db.transactionProof.findFirst({
      where: { releaseId: body.releaseId },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    assert.equal(proof?.status, "pending");
  } finally {
    await db.transactionProof.deleteMany({
      where: { payoutId: payout.id },
    });
    await db.release.deleteMany({
      where: { payoutId: payout.id },
    });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.payout.delete({ where: { id: payout.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
    await db.workspaceMember.deleteMany({
      where: { workspaceId: workspace.id },
    });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});