import test from "node:test";
import assert from "node:assert/strict";

import { derivePayoutStatusDecision } from "./payout-status";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const EARLIER = new Date("2025-12-01T00:00:00.000Z");

test("keeps untouched draft payouts in memory without persisting", () => {
  const decision = derivePayoutStatusDecision({
    status: "draft",
    completedAt: null,
    milestones: [{ status: "pending" }, { status: "pending" }],
  }, NOW);

  assert.deepEqual(decision, {
    status: "draft",
    completedAt: null,
    shouldPersist: false,
  });
});

test("normalizes zero-milestone payouts back to draft", () => {
  const decision = derivePayoutStatusDecision({
    status: "active",
    completedAt: null,
    milestones: [],
  }, NOW);

  assert.deepEqual(decision, {
    status: "draft",
    completedAt: null,
    shouldPersist: true,
  });
});

test("marks payouts with mixed unreleased milestones as active", () => {
  const decision = derivePayoutStatusDecision({
    status: "draft",
    completedAt: null,
    milestones: [{ status: "submitted" }, { status: "approved" }, { status: "rejected" }],
  }, NOW);

  assert.equal(decision.status, "active");
  assert.equal(decision.completedAt, null);
  assert.equal(decision.shouldPersist, true);
});

test("marks payouts with some released milestones as partially released", () => {
  const decision = derivePayoutStatusDecision({
    status: "active",
    completedAt: null,
    milestones: [{ status: "released" }, { status: "approved" }],
  }, NOW);

  assert.equal(decision.status, "partially_released");
  assert.equal(decision.completedAt, null);
  assert.equal(decision.shouldPersist, true);
});

test("marks payouts with all released milestones as completed", () => {
  const decision = derivePayoutStatusDecision({
    status: "active",
    completedAt: null,
    milestones: [{ status: "released" }, { status: "released" }],
  }, NOW);

  assert.equal(decision.status, "completed");
  assert.equal(decision.completedAt?.toISOString(), NOW.toISOString());
  assert.equal(decision.shouldPersist, true);
});

test("preserves completedAt for already completed payouts", () => {
  const decision = derivePayoutStatusDecision({
    status: "completed",
    completedAt: EARLIER,
    milestones: [{ status: "released" }],
  }, NOW);

  assert.equal(decision.status, "completed");
  assert.equal(decision.completedAt?.toISOString(), EARLIER.toISOString());
  assert.equal(decision.shouldPersist, true);
});
