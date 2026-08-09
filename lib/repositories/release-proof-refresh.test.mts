import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveProofRefreshUpdate,
  deriveReleaseRefreshUpdate,
} from "./release-proof";

const NOW = new Date("2026-03-03T00:00:00.000Z");

test("confirmed proof refresh sets chain fields and clears failure fields", () => {
  const input = {
    status: "confirmed" as const,
    txHash: "0xabc",
    network: "Arc Testnet",
    explorerUrl: "https://explorer/tx/0xabc",
    blockNumber: "42",
    failureReason: "old failure",
  };

  assert.deepEqual(deriveProofRefreshUpdate(input, NOW), {
    status: "confirmed",
    txHash: "0xabc",
    network: "Arc Testnet",
    explorerUrl: "https://explorer/tx/0xabc",
    blockNumber: BigInt(42),
    failureReason: null,
    confirmedAt: NOW,
    failedAt: null,
  });

  assert.deepEqual(deriveReleaseRefreshUpdate(input, NOW), {
    status: "confirmed",
    executedAt: NOW,
    failedAt: null,
    failureReason: null,
  });
});

test("failed proof refresh clears chain fields and stamps failure fields", () => {
  const input = {
    status: "failed" as const,
    txHash: "0xabc",
    network: "Arc Testnet",
    explorerUrl: "https://explorer/tx/0xabc",
    blockNumber: "42",
    failureReason: "RPC timeout",
  };

  assert.deepEqual(deriveProofRefreshUpdate(input, NOW), {
    status: "failed",
    txHash: null,
    network: null,
    explorerUrl: null,
    blockNumber: null,
    failureReason: "RPC timeout",
    confirmedAt: null,
    failedAt: NOW,
  });

  assert.deepEqual(deriveReleaseRefreshUpdate(input, NOW), {
    status: "failed",
    executedAt: null,
    failedAt: NOW,
    failureReason: "RPC timeout",
  });
});
