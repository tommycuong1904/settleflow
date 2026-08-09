import test from "node:test";
import assert from "node:assert/strict";

import {
  hasContributorSubmissionPayload,
  hasReviewerContext,
} from "./milestone-payload";

test("hasReviewerContext requires a non-empty reviewer user id", () => {
  assert.equal(hasReviewerContext("user-1"), true);
  assert.equal(hasReviewerContext("   "), false);
  assert.equal(hasReviewerContext(undefined), false);
});

test("hasContributorSubmissionPayload requires contributor id and summary", () => {
  assert.equal(
    hasContributorSubmissionPayload({ contributorUserId: "user-1", summary: "done" }),
    true,
  );
  assert.equal(
    hasContributorSubmissionPayload({ contributorUserId: "user-1", summary: "   " }),
    false,
  );
  assert.equal(
    hasContributorSubmissionPayload({ contributorUserId: "", summary: "done" }),
    false,
  );
});
