import test from "node:test";
import assert from "node:assert/strict";

import {
  hasContiguousMilestoneSequences,
  hasValidMilestoneShape,
  isNonEmptyString,
  sumMilestoneAmounts,
} from "./payout-payload";

test("isNonEmptyString trims and rejects blank values", () => {
  assert.equal(isNonEmptyString("hello"), true);
  assert.equal(isNonEmptyString("  hello  "), true);
  assert.equal(isNonEmptyString("   "), false);
  assert.equal(isNonEmptyString(undefined), false);
});

test("hasValidMilestoneShape requires non-empty strings and integer sequence", () => {
  assert.equal(
    hasValidMilestoneShape([
      { title: "M1", description: "Desc", amountUsdc: "10", sequence: 1 },
      { title: "M2", description: "Desc", amountUsdc: "20", sequence: 2 },
    ]),
    true,
  );

  assert.equal(
    hasValidMilestoneShape([
      { title: "M1", description: "", amountUsdc: "10", sequence: 1 },
    ]),
    false,
  );

  assert.equal(
    hasValidMilestoneShape([
      { title: "M1", description: "Desc", amountUsdc: "10", sequence: 1.5 },
    ]),
    false,
  );
});

test("hasContiguousMilestoneSequences enforces 1-based contiguous ordering", () => {
  assert.equal(hasContiguousMilestoneSequences([{ sequence: 1 }, { sequence: 2 }]), true);
  assert.equal(hasContiguousMilestoneSequences([{ sequence: 2 }, { sequence: 3 }]), false);
  assert.equal(hasContiguousMilestoneSequences([{ sequence: 1 }, { sequence: 3 }]), false);
});

test("sumMilestoneAmounts adds decimal strings precisely", () => {
  const total = sumMilestoneAmounts([
    { amountUsdc: "0.1" },
    { amountUsdc: "0.2" },
    { amountUsdc: "10.25" },
  ]);

  assert.equal(total.toString(), "10.55");
});
