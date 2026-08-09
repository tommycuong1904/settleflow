import test from "node:test";
import assert from "node:assert/strict";

import { deriveMilestoneReviewUpdate } from "./milestone-review";
import { deriveMilestoneSubmissionUpdate } from "./milestone-submission";

const NOW = new Date("2026-02-02T00:00:00.000Z");

test("approve review clears rejectedAt and stamps approvedAt", () => {
  const update = deriveMilestoneReviewUpdate("approved", NOW);

  assert.deepEqual(update, {
    status: "approved",
    approvedAt: NOW,
    rejectedAt: null,
  });
});

test("reject review clears approved and released timestamps", () => {
  const update = deriveMilestoneReviewUpdate("rejected", NOW);

  assert.deepEqual(update, {
    status: "rejected",
    approvedAt: null,
    rejectedAt: NOW,
    releasedAt: null,
  });
});

test("submission resets review and release timestamps", () => {
  const update = deriveMilestoneSubmissionUpdate(NOW);

  assert.deepEqual(update, {
    status: "submitted",
    submittedAt: NOW,
    approvedAt: null,
    rejectedAt: null,
    releasedAt: null,
  });
});
