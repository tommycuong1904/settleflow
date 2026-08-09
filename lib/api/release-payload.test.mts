import test from "node:test";
import assert from "node:assert/strict";

import {
  hasOwnerWorkspaceContext,
  hasReleaseAmountPayload,
  isNonEmptyString,
  isValidProofRefreshStatus,
} from "./release-payload";

test("isNonEmptyString accepts trimmed non-empty strings only", () => {
  assert.equal(isNonEmptyString("abc"), true);
  assert.equal(isNonEmptyString("  abc  "), true);
  assert.equal(isNonEmptyString("   "), false);
  assert.equal(isNonEmptyString(null), false);
});

test("isValidProofRefreshStatus allows only confirmed and failed", () => {
  assert.equal(isValidProofRefreshStatus("confirmed"), true);
  assert.equal(isValidProofRefreshStatus("failed"), true);
  assert.equal(isValidProofRefreshStatus("pending"), false);
  assert.equal(isValidProofRefreshStatus(undefined), false);
});

test("hasOwnerWorkspaceContext requires both owner and workspace context", () => {
  assert.equal(hasOwnerWorkspaceContext({ workspaceId: "ws-1", ownerUserId: "user-1" }), true);
  assert.equal(hasOwnerWorkspaceContext({ workspaceId: "", ownerUserId: "user-1" }), false);
  assert.equal(hasOwnerWorkspaceContext({ workspaceId: "ws-1", ownerUserId: "   " }), false);
});

test("hasReleaseAmountPayload requires owner and amountUsdc", () => {
  assert.equal(hasReleaseAmountPayload({ amountUsdc: "10" }, "user-1"), true);
  assert.equal(hasReleaseAmountPayload({ amountUsdc: "" }, "user-1"), false);
  assert.equal(hasReleaseAmountPayload({ amountUsdc: "10" }, ""), false);
});
