import test from "node:test";
import assert from "node:assert/strict";

import {
  getLegacyReleaseErrorStatus,
  hasRequiredLegacyReleaseFields,
} from "./legacy-release";

test("hasRequiredLegacyReleaseFields requires all mandatory non-empty strings", () => {
  assert.equal(
    hasRequiredLegacyReleaseFields({
      payoutId: "p1",
      milestoneId: "m1",
      recipientAddress: "0xabc",
      amount: "10",
    }),
    true,
  );

  assert.equal(
    hasRequiredLegacyReleaseFields({
      payoutId: "p1",
      milestoneId: "",
      recipientAddress: "0xabc",
      amount: "10",
    }),
    false,
  );

  assert.equal(
    hasRequiredLegacyReleaseFields({
      payoutId: "p1",
      milestoneId: "m1",
      recipientAddress: "0xabc",
    }),
    false,
  );
});

test("getLegacyReleaseErrorStatus maps workspace mismatch to 409 and others to 400", () => {
  assert.equal(getLegacyReleaseErrorStatus("WORKSPACE_SCOPE_MISMATCH"), 409);
  assert.equal(getLegacyReleaseErrorStatus("MILESTONE_NOT_FOUND"), 400);
});
