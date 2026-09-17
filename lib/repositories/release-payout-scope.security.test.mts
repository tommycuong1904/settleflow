import test from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db/client";
import { projectReleaseDetail } from "@/lib/repositories/releases";
import { projectPayoutDetail, listPayouts } from "@/lib/repositories/payouts";

const sensitiveRelease = {
  id: "release-1", payoutId: "payout-1", payout: { workspaceId: "workspace-1" },
  milestoneId: "milestone-1", triggeredByUserId: "actor-sensitive", amountUsdc: { toString: () => "731.42" },
  status: "failed", arcRequestId: "arc-sensitive", destinationWalletAddress: "0xSensitiveWallet",
  failureReason: "Failure Sensitive", requestedAt: new Date("2026-09-06T00:00:00Z"),
  executedAt: null, failedAt: new Date("2026-09-06T00:01:00Z"), createdAt: new Date("2026-09-06T00:00:00Z"),
  updatedAt: new Date("2026-09-06T00:01:00Z"), proofs: [{ id: "proof-1", status: "failed", txHash: "0xSensitiveTx", network: "arc-testnet", explorerUrl: "https://sensitive.invalid", blockNumber: BigInt(999), failureReason: "Proof Sensitive", confirmedAt: null, failedAt: new Date("2026-09-06T00:01:00Z"), createdAt: new Date(), updatedAt: new Date() }],
} as unknown as Parameters<typeof projectReleaseDetail>[0];

test("Reviewer and Ops release projections omit forbidden fields and values", () => {
  for (const role of ["reviewer", "ops"] as const) {
    const result = projectReleaseDetail(sensitiveRelease, role);
    for (const key of ["amountUsdc", "destinationWalletAddress", "triggeredByUserId", "failureReason", "proofs", "txHash", "network", "explorerUrl", "blockNumber"]) assert.equal(key in result, false, `${role}:${key}`);
    const text = JSON.stringify(result);
    for (const value of ["731.42", "0xSensitiveWallet", "actor-sensitive", "Failure Sensitive", "0xSensitiveTx", "arc-testnet", "sensitive.invalid", "999"]) assert.equal(text.includes(value), false, `${role}:${value}`);
  }
});

test("Reviewer payout detail omits contributorId", () => {
  const result = projectPayoutDetail({ payout: { id: "p1", title: "Payout", contributorId: "contributor-sensitive", status: "active", createdAt: "2026-09-06T00:00:00Z", totalAmount: 731.42, currency: "USDC" }, milestones: [{ id: "m1", payoutId: "p1", title: "Review", description: "desc", amount: 731.42, status: "submitted" }] } as unknown as Parameters<typeof projectPayoutDetail>[0], "reviewer");
  assert.equal("contributorId" in result.payout, false);
  assert.equal(JSON.stringify(result).includes("contributor-sensitive"), false);
});

test("listPayouts preserves workspace-wide Owner scope and contributor linked-user scope", async () => {
  const original = db.payout.findMany;
  const seen: Parameters<typeof db.payout.findMany>[0][] = [];
  db.payout.findMany = (async (args) => { seen.push(args); return []; }) as typeof db.payout.findMany;
  try {
    await listPayouts({ workspaceId: "workspace-1" });
    assert.deepEqual(seen[0].where, { workspaceId: "workspace-1" });
    await listPayouts({ workspaceId: "workspace-1", linkedUserId: "linked-user-1" });
    assert.deepEqual(seen[1].where, { workspaceId: "workspace-1", contributor: { linkedUserId: "linked-user-1" } });
  } finally { db.payout.findMany = original; }
});
