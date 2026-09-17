import test from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db/client";
import {
  getPayoutActivity,
  getWorkspaceActivity,
  projectActivity,
} from "@/lib/repositories/payout-activity";
import type { ActivityItem } from "@/lib/models/activity-item";

const fixture: ActivityItem = {
  id: "activity-1",
  entityType: "release",
  entityId: "release-1",
  action: "release_failed",
  occurredAt: "2026-09-06T00:00:00.000Z",
  actorLabel: "Actor Sensitive Name",
  title: "Requested 731.42 USDC for Wallet Sensitive",
  description: "731.42 USDC wallet-sensitive failure Actor Sensitive Name",
  metadata: {
    amountUsdc: "731.42",
    wallet: "Wallet Sensitive",
    actor: "Actor Sensitive Name",
    txHash: "0xSensitiveTx",
    network: "arc-testnet",
    explorerUrl: "https://explorer.invalid/0xSensitiveTx",
    blockNumber: "999",
    failureReason: "Failure Sensitive Text",
  },
};

test("Reviewer projection omits forbidden keys and sensitive values", () => {
  const result = projectActivity(fixture, "reviewer");
  assert.deepEqual(Object.keys(result).sort(), ["action", "entityId", "entityType", "id", "occurredAt", "title"]);
  const serialized = JSON.stringify(result);
  for (const value of ["731.42", "Wallet Sensitive", "Actor Sensitive Name", "Failure Sensitive Text", "0xSensitiveTx", "arc-testnet"]) {
    assert.equal(serialized.includes(value), false, value);
  }
});

test("Ops projection contains only controlled operational fields", () => {
  const result = projectActivity(fixture, "ops");
  assert.deepEqual(Object.keys(result).sort(), ["action", "description", "entityId", "entityType", "id", "occurredAt", "title"]);
  const serialized = JSON.stringify(result);
  for (const value of ["731.42", "Wallet Sensitive", "Actor Sensitive Name", "Failure Sensitive Text", "0xSensitiveTx", "arc-testnet", "999"]) {
    assert.equal(serialized.includes(value), false, value);
  }
  for (const key of ["amount", "amountUsdc", "wallet", "actorLabel", "metadata", "txHash", "network", "explorerUrl", "blockNumber"]) {
    assert.equal(key in result, false, key);
  }
});

test("Owner projection preserves broad activity behavior", () => {
  assert.deepEqual(projectActivity(fixture, "owner"), fixture);
});

test("Contributor projection preserves broad activity shape for isolated inputs", () => {
  assert.deepEqual(projectActivity(fixture, "contributor"), fixture);
});

test("exact role activity projections do not inherit forbidden fields", () => {
  for (const role of ["reviewer", "ops"] as const) {
    const result = projectActivity(fixture, role);
    assert.equal("metadata" in result, false);
    assert.equal("actorLabel" in result, false);
    assert.equal("blockNumber" in result, false);
  }
});

const logFixture = {
  id: "log-sensitive-1",
  entityType: "release",
  entityId: "release-sensitive-1",
  action: "release_failed",
  occurredAt: new Date("2026-09-06T00:00:00.000Z"),
  milestoneId: "milestone-sensitive-1",
  actorUser: { id: "actor-sensitive", displayName: "Actor Sensitive Name" },
  metadataJson: {
    amountUsdc: "731.42", wallet: "Wallet Sensitive", actor: "Actor Sensitive Name",
    txHash: "0xSensitiveTx", network: "arc-testnet", explorerUrl: "https://explorer.invalid/0xSensitiveTx",
    blockNumber: "999", failureReason: "Failure Sensitive Text",
  },
};

type ActivityFindManyArgs = Parameters<typeof db.activityLog.findMany>[0];

async function withActivityLog<T>(fn: (seen: ActivityFindManyArgs[]) => Promise<T>) {
  const original = db.activityLog.findMany;
  const originalMilestones = db.milestone.findMany;
  const originalPayout = db.payout.findFirst;
  const seen: ActivityFindManyArgs[] = [];
  db.activityLog.findMany = (async (args) => { seen.push(args); return [logFixture]; }) as unknown as typeof db.activityLog.findMany;
  db.milestone.findMany = (async () => []) as unknown as typeof db.milestone.findMany;
  db.payout.findFirst = (async () => null) as unknown as typeof db.payout.findFirst;
  try { return await fn(seen); } finally {
    db.activityLog.findMany = original;
    db.milestone.findMany = originalMilestones;
    db.payout.findFirst = originalPayout;
  }
}

function assertSafe(result: unknown) {
  const text = JSON.stringify(result);
  for (const value of ["731.42", "Wallet Sensitive", "Actor Sensitive Name", "0xSensitiveTx", "arc-testnet", "explorer.invalid", "999", "Failure Sensitive Text"]) assert.equal(text.includes(value), false, value);
  assert.ok(Array.isArray(result));
  for (const item of result) for (const key of ["amount", "amountUsdc", "wallet", "creator", "contributor", "actorLabel", "metadata", "txHash", "network", "explorerUrl", "blockNumber"]) assert.equal(Object.prototype.hasOwnProperty.call(item, key), false, key);
}

test("repository Reviewer and Ops payout activity are policy-safe", async () => {
  await withActivityLog(async () => {
    const reviewer = await getPayoutActivity("payout-1", "workspace-1", undefined, "reviewer");
    const ops = await getPayoutActivity("payout-1", "workspace-1", undefined, "ops");
    assertSafe(reviewer); assertSafe(ops);
  });
});

test("repository Reviewer and Ops workspace activity are policy-safe", async () => {
  await withActivityLog(async () => {
    const reviewer = await getWorkspaceActivity("workspace-1", "reviewer");
    const ops = await getWorkspaceActivity("workspace-1", "ops");
    assertSafe(reviewer); assertSafe(ops);
  });
});

test("repository Contributor scope remains linked-user isolated", async () => {
  await withActivityLog(async (seen) => {
    await getPayoutActivity("payout-1", "workspace-1", { linkedUserId: "linked-user-1" }, "contributor");
    assert.deepEqual(seen[0]?.where?.payout?.contributor, { linkedUserId: "linked-user-1" });
  });
});

test("repository Owner activity retains broad logged fields", async () => {
  const originalLogs = db.activityLog.findMany;
  const originalMilestones = db.milestone.findMany;
  const originalPayout = db.payout.findFirst;
  db.activityLog.findMany = (async () => [logFixture]) as unknown as typeof db.activityLog.findMany;
  db.milestone.findMany = (async () => [{ id: "milestone-sensitive-1", title: "Sensitive milestone" }]) as typeof db.milestone.findMany;
  db.payout.findFirst = (async () => null) as unknown as typeof db.payout.findFirst;
  try {
    const result = await getPayoutActivity("payout-1", "workspace-1", undefined, "owner");
    assert.equal(result.some((item) => item.metadata?.amountUsdc === "731.42"), true);
    assert.equal(result.some((item) => item.actorLabel === "Actor Sensitive Name"), true);
  } finally {
    db.activityLog.findMany = originalLogs;
    db.milestone.findMany = originalMilestones;
    db.payout.findFirst = originalPayout;
  }
});
