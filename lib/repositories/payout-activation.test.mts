import test from "node:test";
import assert from "node:assert/strict";
import { Decimal } from "@prisma/client/runtime/library";

import { derivePayoutActivationInvariantError } from "./payout-activation";

test("activation requires target wallet and at least one milestone", () => {
  const noWallet = derivePayoutActivationInvariantError({
    targetWalletAddress: null,
    milestones: [{ amountUsdc: new Decimal("50") }],
    totalAmountUsdc: new Decimal("50"),
  });

  const noMilestones = derivePayoutActivationInvariantError({
    targetWalletAddress: "0xabc",
    milestones: [],
    totalAmountUsdc: new Decimal("50"),
  });

  assert.equal(noWallet, "PAYOUT_INCOMPLETE");
  assert.equal(noMilestones, "PAYOUT_INCOMPLETE");
});

test("activation requires milestone total to match payout total", () => {
  const mismatch = derivePayoutActivationInvariantError({
    targetWalletAddress: "0xabc",
    milestones: [
      { amountUsdc: new Decimal("30") },
      { amountUsdc: new Decimal("40") },
    ],
    totalAmountUsdc: new Decimal("100"),
  });

  assert.equal(mismatch, "MILESTONE_TOTAL_MISMATCH");
});

test("activation passes when wallet, milestones, and totals are valid", () => {
  const result = derivePayoutActivationInvariantError({
    targetWalletAddress: "0xabc",
    milestones: [
      { amountUsdc: new Decimal("30") },
      { amountUsdc: new Decimal("70") },
    ],
    totalAmountUsdc: new Decimal("100"),
  });

  assert.equal(result, null);
});
