import test from "node:test";
import assert from "node:assert/strict";
import { Decimal } from "@prisma/client/runtime/library";

import { normalizeReleaseProof, normalizeReleaseRecord } from "./releases";

test("normalizeReleaseProof stringifies block number and preserves null", () => {
  assert.deepEqual(
    normalizeReleaseProof({
      id: "proof-1",
      status: "confirmed",
      txHash: "0xabc",
      network: "arc",
      explorerUrl: "https://explorer",
      blockNumber: BigInt(42),
      failureReason: null,
      confirmedAt: null,
      failedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    }),
    {
      id: "proof-1",
      status: "confirmed",
      txHash: "0xabc",
      network: "arc",
      explorerUrl: "https://explorer",
      blockNumber: "42",
      failureReason: null,
      confirmedAt: null,
      failedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    },
  );
});

test("normalizeReleaseRecord stringifies amount and strips payout relation", () => {
  const normalized = normalizeReleaseRecord({
    id: "rel-1",
    payoutId: "p-1",
    payout: { workspaceId: "ws-1" },
    milestoneId: "m-1",
    triggeredByUserId: "u-1",
    amountUsdc: new Decimal("12.5"),
    status: "pending",
    arcRequestId: null,
    destinationWalletAddress: "0xabc",
    failureReason: null,
    requestedAt: null,
    executedAt: null,
    failedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    proofs: [],
  });

  assert.equal(normalized.amountUsdc, "12.5");
  assert.equal("payout" in normalized, false);
  assert.deepEqual(normalized.proofs, []);
});
