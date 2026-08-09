import test from "node:test";
import assert from "node:assert/strict";

import {
  derivePatchedTotalAmountUsdc,
  hasOnlyAllowedPayoutUpdateFields,
} from "./payout-payload";

test("hasOnlyAllowedPayoutUpdateFields accepts only known payout draft keys", () => {
  assert.equal(
    hasOnlyAllowedPayoutUpdateFields({ title: "A", milestones: [] }),
    true,
  );

  assert.equal(
    hasOnlyAllowedPayoutUpdateFields({ title: "A", status: "active" }),
    false,
  );
});

test("derivePatchedTotalAmountUsdc sums milestones and skips undefined payloads", () => {
  assert.equal(
    derivePatchedTotalAmountUsdc([
      { amountUsdc: "10.25" },
      { amountUsdc: "0.75" },
    ]),
    "11",
  );

  assert.equal(derivePatchedTotalAmountUsdc(undefined), undefined);
});
