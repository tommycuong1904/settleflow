import test from "node:test";
import assert from "node:assert/strict";

import { resolveProductContext } from "./product-context-server";
import {
  assertCanActivatePayout,
  assertCanApproveMilestone,
  assertCanSubmitMilestone,
} from "./product-policy";

test("resolveProductContext falls back to defaults and computes active user", () => {
  const context = resolveProductContext({
    actor: "reviewer",
    ownerUserId: "owner-1",
    reviewerUserId: "reviewer-1",
    contributorUserId: "contributor-1",
    workspaceId: "workspace-1",
  });

  assert.equal(context.actor, "reviewer");
  assert.equal(context.activeUserId, "reviewer-1");
  assert.equal(context.workspaceId, "workspace-1");
});

test("owner-only policy rejects actor mismatch for activate payout", () => {
  const violation = assertCanActivatePayout({
    productContext: resolveProductContext({
      actor: "reviewer",
      ownerUserId: "owner-1",
      reviewerUserId: "reviewer-1",
      contributorUserId: "contributor-1",
      workspaceId: "workspace-1",
    }),
    actorUserId: "owner-1",
  });

  assert.equal(violation?.code, "FORBIDDEN_PAYOUT_ACTIVATE_ACTOR");
});

test("reviewer policy rejects active-user mismatch", () => {
  const violation = assertCanApproveMilestone({
    productContext: resolveProductContext({
      actor: "reviewer",
      ownerUserId: "owner-1",
      reviewerUserId: "reviewer-1",
      contributorUserId: "contributor-1",
      workspaceId: "workspace-1",
    }),
    actorUserId: "reviewer-2",
  });

  assert.equal(violation?.code, "FORBIDDEN_MILESTONE_APPROVE_CONTEXT");
});

test("contributor policy passes when actor and active user align", () => {
  const violation = assertCanSubmitMilestone({
    productContext: resolveProductContext({
      actor: "contributor",
      ownerUserId: "owner-1",
      reviewerUserId: "reviewer-1",
      contributorUserId: "contributor-1",
      workspaceId: "workspace-1",
    }),
    actorUserId: "contributor-1",
  });

  assert.equal(violation, null);
});
