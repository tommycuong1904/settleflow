import test from "node:test";
import assert from "node:assert/strict";
import { Decimal } from "@prisma/client/runtime/library";

import { deriveQueuedReleasePayload } from "./milestone-release";
import { deriveRetryReleasePayload } from "./release-retry";

test("queued release payload sets queued status and null source wallet", () => {
  const payload = deriveQueuedReleasePayload({
    payoutId: "p1",
    milestoneId: "m1",
    triggeredByUserId: "u1",
    amountUsdc: new Decimal("125.50"),
    executionMode: "browser_wallet",
    destinationWalletAddress: "0xabc",
  });

  assert.equal(payload.status, "queued");
  assert.equal(payload.sourceWalletAddress, null);
  assert.equal(payload.destinationWalletAddress, "0xabc");
  assert.equal(payload.executionMode, "browser_wallet");
  assert.equal(payload.amountUsdc.toString(), "125.5");
});

test("retry release payload preserves prior execution details and re-queues", () => {
  const payload = deriveRetryReleasePayload({
    payoutId: "p1",
    milestoneId: "m1",
    triggeredByUserId: "u2",
    amountUsdc: new Decimal("75"),
    executionMode: "circle_wallet",
    sourceWalletAddress: "0xsource",
    destinationWalletAddress: "0xdest",
  });

  assert.equal(payload.status, "queued");
  assert.equal(payload.executionMode, "circle_wallet");
  assert.equal(payload.sourceWalletAddress, "0xsource");
  assert.equal(payload.destinationWalletAddress, "0xdest");
  assert.equal(payload.amountUsdc.toString(), "75");
});
