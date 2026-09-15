import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { POST as legacyRelease } from "@/app/api/release/route";

const wallet = "0x5555555555555555555555555555555555555555";

async function fixture(role: "owner" | "contributor") {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `legacy-integrity-${suffix}@example.com`;
  const user = await db.user.create({ data: { displayName: "Legacy Integrity User", email } });
  const workspace = await db.workspace.create({ data: { name: "Legacy Integrity Workspace", slug: `legacy-integrity-${suffix}` } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role } });
  const contributor = await db.contributor.create({ data: { workspaceId: workspace.id, createdByUserId: user.id, name: "Legacy Contributor", walletAddress: wallet } });
  const payout = await db.payout.create({ data: { workspaceId: workspace.id, contributorId: contributor.id, createdByUserId: user.id, title: "Legacy Payout", totalAmountUsdc: "5", status: "active", targetWalletAddress: wallet } });
  const milestone = await db.milestone.create({ data: { payoutId: payout.id, title: "Legacy Milestone", description: "Integrity test", amountUsdc: "5", sequence: 1, status: "approved" } });
  const token = await createSessionToken({ userId: user.id, email, name: "Legacy Integrity User", address: null, authType: "web2_google" });
  return { user, workspace, contributor, payout, milestone, headers: { cookie: `sf_session=${token}` } };
}

async function cleanup(f: Awaited<ReturnType<typeof fixture>>) {
  await db.transactionProof.deleteMany({ where: { payoutId: f.payout.id } });
  await db.release.deleteMany({ where: { payoutId: f.payout.id } });
  await db.milestone.delete({ where: { id: f.milestone.id } });
  await db.payout.delete({ where: { id: f.payout.id } });
  await db.contributor.delete({ where: { id: f.contributor.id } });
  await db.workspaceMember.deleteMany({ where: { workspaceId: f.workspace.id } });
  await db.workspace.delete({ where: { id: f.workspace.id } });
  await db.user.delete({ where: { id: f.user.id } });
}

test("legacy release endpoint is disabled", async () => {
  process.env.NEXT_PUBLIC_ARC_EXECUTION_MODE = "mock";
  const f = await fixture("owner");
  try {
    const response = await legacyRelease(new Request("https://settleflow.local/api/release", {
      method: "POST",
      headers: f.headers,
      body: JSON.stringify({ payoutId: f.payout.id, milestoneId: f.milestone.id, recipientAddress: wallet, amount: "5" }),
    }));
    assert.equal(response.status, 410);
    assert.equal(await db.release.count({ where: { payoutId: f.payout.id } }), 0);
  } finally {
    await cleanup(f);
  }
});

test("legacy release stays disabled when repository state is unavailable", async () => {
  process.env.NEXT_PUBLIC_ARC_EXECUTION_MODE = "mock";
  const f = await fixture("owner");
  const originalFindFirst = db.release.findFirst;
  db.release.findFirst = (async (args: any) => {
    if (args?.where?.payoutId === f.payout.id) return null;
    return originalFindFirst.call(db.release, args);
  }) as typeof db.release.findFirst;
  try {
    const response = await legacyRelease(new Request("https://settleflow.local/api/release", {
      method: "POST",
      headers: f.headers,
      body: JSON.stringify({ payoutId: f.payout.id, milestoneId: f.milestone.id, recipientAddress: wallet, amount: "5" }),
    }));
    assert.equal(response.status, 410);
    db.release.findFirst = originalFindFirst;
    assert.equal(await db.release.count({ where: { payoutId: f.payout.id } }), 0);
  } finally {
    db.release.findFirst = originalFindFirst;
    await cleanup(f);
  }
});

test("legacy release remains disabled for non-owners", async () => {
  const f = await fixture("contributor");
  try {
    const response = await legacyRelease(new Request("https://settleflow.local/api/release", {
      method: "POST",
      headers: f.headers,
      body: JSON.stringify({ payoutId: f.payout.id, milestoneId: f.milestone.id, recipientAddress: wallet, amount: "5" }),
    }));
    assert.equal(response.status, 410);
    assert.equal(await db.release.count({ where: { payoutId: f.payout.id } }), 0);
  } finally {
    await cleanup(f);
  }
});
