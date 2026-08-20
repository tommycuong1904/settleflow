/**
 * Integration tests for the Payout State Machine full lifecycle.
 * Covers: draft → active → submitted → approved → released → completed
 * Also tests: reject milestone, role-based policy, milestone allocation rules.
 *
 * These tests are pure logic tests — no DB, no network.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { Decimal } from "@prisma/client/runtime/library";

import { derivePayoutStatusDecision } from "./payout-status.js";
import { derivePayoutActivationInvariantError } from "./payout-activation.js";

// ─── Types ────────────────────────────────────────────────────────────────

type MilestoneStatus = "pending" | "submitted" | "approved" | "released" | "rejected";

interface SimMilestone {
  id: string;
  title: string;
  amountUsdc: Decimal;
  status: MilestoneStatus;
}

interface SimPayoutState {
  id: string;
  status: "draft" | "active" | "partially_released" | "completed";
  targetWalletAddress: string | null;
  milestones: SimMilestone[];
  completedAt: Date | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeMilestone(
  id: string,
  title: string,
  amount: string,
  status: MilestoneStatus = "pending",
): SimMilestone {
  return { id, title, amountUsdc: new Decimal(amount), status };
}

function totalAmount(milestones: SimMilestone[]): Decimal {
  return milestones.reduce((sum, m) => sum.add(m.amountUsdc), new Decimal("0"));
}

function applyMilestoneTransition(
  payout: SimPayoutState,
  milestoneId: string,
  nextStatus: MilestoneStatus,
): SimPayoutState {
  return {
    ...payout,
    milestones: payout.milestones.map((m) =>
      m.id === milestoneId ? { ...m, status: nextStatus } : m,
    ),
  };
}

const NOW = new Date("2026-08-01T12:00:00.000Z");

// ─── Draft Payout — Activation Invariant Tests ────────────────────────────

test("draft: activation fails without a target wallet address", () => {
  const milestones = [makeMilestone("m1", "Design", "500"), makeMilestone("m2", "Dev", "500")];
  const error = derivePayoutActivationInvariantError({
    targetWalletAddress: null,
    milestones,
    totalAmountUsdc: totalAmount(milestones),
  });
  assert.equal(error, "PAYOUT_INCOMPLETE");
});

test("draft: activation fails with no milestones", () => {
  const error = derivePayoutActivationInvariantError({
    targetWalletAddress: "0xabc",
    milestones: [],
    totalAmountUsdc: new Decimal("0"),
  });
  assert.equal(error, "PAYOUT_INCOMPLETE");
});

test("draft: activation fails when milestone amounts don't sum to total", () => {
  const milestones = [makeMilestone("m1", "Design", "300"), makeMilestone("m2", "Dev", "400")];
  const error = derivePayoutActivationInvariantError({
    targetWalletAddress: "0xabc",
    milestones,
    totalAmountUsdc: new Decimal("1000"), // mismatch
  });
  assert.equal(error, "MILESTONE_TOTAL_MISMATCH");
});

test("draft: activation succeeds with wallet, milestones, and matching totals", () => {
  const milestones = [makeMilestone("m1", "Design", "300"), makeMilestone("m2", "Dev", "700")];
  const error = derivePayoutActivationInvariantError({
    targetWalletAddress: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
    milestones,
    totalAmountUsdc: totalAmount(milestones),
  });
  assert.equal(error, null);
});

// ─── Status Derivation — Full State Machine Flow ──────────────────────────

test("state-machine: all-pending milestones → draft status", () => {
  const decision = derivePayoutStatusDecision({
    status: "draft",
    completedAt: null,
    milestones: [{ status: "pending" }, { status: "pending" }],
  }, NOW);
  assert.equal(decision.status, "draft");
  assert.equal(decision.shouldPersist, false);
});

test("state-machine: submitted milestone triggers active status", () => {
  const decision = derivePayoutStatusDecision({
    status: "draft",
    completedAt: null,
    milestones: [{ status: "submitted" }, { status: "pending" }],
  }, NOW);
  assert.equal(decision.status, "active");
  assert.equal(decision.shouldPersist, true);
});

test("state-machine: approved milestone triggers active status", () => {
  const decision = derivePayoutStatusDecision({
    status: "draft",
    completedAt: null,
    milestones: [{ status: "approved" }, { status: "pending" }],
  }, NOW);
  assert.equal(decision.status, "active");
  assert.equal(decision.shouldPersist, true);
});

test("state-machine: first release → partially_released", () => {
  const decision = derivePayoutStatusDecision({
    status: "active",
    completedAt: null,
    milestones: [{ status: "released" }, { status: "pending" }],
  }, NOW);
  assert.equal(decision.status, "partially_released");
  assert.equal(decision.completedAt, null);
  assert.equal(decision.shouldPersist, true);
});

test("state-machine: all released → completed with timestamp", () => {
  const decision = derivePayoutStatusDecision({
    status: "partially_released",
    completedAt: null,
    milestones: [{ status: "released" }, { status: "released" }, { status: "released" }],
  }, NOW);
  assert.equal(decision.status, "completed");
  assert.equal(decision.completedAt?.toISOString(), NOW.toISOString());
  assert.equal(decision.shouldPersist, true);
});

test("state-machine: preserves original completedAt on already-completed payout", () => {
  const originalDate = new Date("2026-06-01T00:00:00.000Z");
  const decision = derivePayoutStatusDecision({
    status: "completed",
    completedAt: originalDate,
    milestones: [{ status: "released" }],
  }, NOW);
  assert.equal(decision.status, "completed");
  assert.equal(decision.completedAt?.toISOString(), originalDate.toISOString());
});

// ─── State Machine: Reject & Re-submit Flow ───────────────────────────────

test("state-machine: rejected milestone does not advance to completed", () => {
  const payout: SimPayoutState = {
    id: "payout-1",
    status: "active",
    targetWalletAddress: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
    milestones: [
      makeMilestone("m1", "Design", "500", "submitted"),
      makeMilestone("m2", "Dev", "500", "pending"),
    ],
    completedAt: null,
  };

  // Reviewer rejects first milestone
  const afterReject = applyMilestoneTransition(payout, "m1", "rejected");
  assert.equal(afterReject.milestones[0].status, "rejected");

  // Status should stay active, not completed
  const decision = derivePayoutStatusDecision({
    status: afterReject.status,
    completedAt: afterReject.completedAt,
    milestones: afterReject.milestones,
  }, NOW);
  assert.equal(decision.status, "active");
  assert.notEqual(decision.status, "completed");
});

test("state-machine: contributor can re-submit rejected milestone", () => {
  const payout: SimPayoutState = {
    id: "payout-1",
    status: "active",
    targetWalletAddress: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
    milestones: [
      makeMilestone("m1", "Design", "500", "rejected"),
    ],
    completedAt: null,
  };

  // Contributor re-submits
  const afterResubmit = applyMilestoneTransition(payout, "m1", "submitted");
  assert.equal(afterResubmit.milestones[0].status, "submitted");

  const decision = derivePayoutStatusDecision({
    status: afterResubmit.status,
    completedAt: afterResubmit.completedAt,
    milestones: afterResubmit.milestones,
  }, NOW);
  assert.equal(decision.status, "active");
});

// ─── Full End-to-End 3-Milestone Lifecycle ────────────────────────────────

test("lifecycle: full 3-milestone payout from draft to completed", () => {
  let payout: SimPayoutState = {
    id: "payout-lifecycle",
    status: "draft",
    targetWalletAddress: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
    milestones: [
      makeMilestone("m1", "Design", "200"),
      makeMilestone("m2", "Development", "500"),
      makeMilestone("m3", "QA & Delivery", "300"),
    ],
    completedAt: null,
  };

  // ── Step 1: Validate activation ──────────────────────────────────────────
  const activationError = derivePayoutActivationInvariantError({
    targetWalletAddress: payout.targetWalletAddress,
    milestones: payout.milestones,
    totalAmountUsdc: totalAmount(payout.milestones),
  });
  assert.equal(activationError, null, "Activation should succeed");

  // ── Step 2: Contributor submits m1 ───────────────────────────────────────
  payout = applyMilestoneTransition(payout, "m1", "submitted");
  const afterSubmit1 = derivePayoutStatusDecision({ status: "draft", completedAt: null, milestones: payout.milestones }, NOW);
  assert.equal(afterSubmit1.status, "active");

  // ── Step 3: Reviewer approves m1 ─────────────────────────────────────────
  payout = applyMilestoneTransition(payout, "m1", "approved");
  const afterApprove1 = derivePayoutStatusDecision({ status: "active", completedAt: null, milestones: payout.milestones }, NOW);
  assert.equal(afterApprove1.status, "active");

  // ── Step 4: Owner releases m1 on Arc ─────────────────────────────────────
  payout = applyMilestoneTransition(payout, "m1", "released");
  const afterRelease1 = derivePayoutStatusDecision({ status: "active", completedAt: null, milestones: payout.milestones }, NOW);
  assert.equal(afterRelease1.status, "partially_released");

  // ── Step 5: Submit, approve, release m2 ──────────────────────────────────
  payout = applyMilestoneTransition(payout, "m2", "submitted");
  payout = applyMilestoneTransition(payout, "m2", "approved");
  payout = applyMilestoneTransition(payout, "m2", "released");
  const afterRelease2 = derivePayoutStatusDecision({ status: "partially_released", completedAt: null, milestones: payout.milestones }, NOW);
  assert.equal(afterRelease2.status, "partially_released");

  // ── Step 6: Submit, approve, release m3 → completed ──────────────────────
  payout = applyMilestoneTransition(payout, "m3", "submitted");
  payout = applyMilestoneTransition(payout, "m3", "approved");
  payout = applyMilestoneTransition(payout, "m3", "released");
  const afterRelease3 = derivePayoutStatusDecision({ status: "partially_released", completedAt: null, milestones: payout.milestones }, NOW);
  assert.equal(afterRelease3.status, "completed");
  assert.ok(afterRelease3.completedAt instanceof Date);

  // Verify all milestones are released
  assert.ok(payout.milestones.every((m) => m.status === "released"));

  // Verify total settled
  const settledTotal = totalAmount(payout.milestones);
  assert.equal(settledTotal.toFixed(0), "1000");
});

// ─── Edge Cases ───────────────────────────────────────────────────────────

test("edge: single-milestone payout goes directly to completed on release", () => {
  const decision = derivePayoutStatusDecision({
    status: "active",
    completedAt: null,
    milestones: [{ status: "released" }],
  }, NOW);
  assert.equal(decision.status, "completed");
});

test("edge: payout with zero milestones is normalized to draft", () => {
  const decision = derivePayoutStatusDecision({
    status: "active",
    completedAt: null,
    milestones: [],
  }, NOW);
  assert.equal(decision.status, "draft");
  assert.equal(decision.shouldPersist, true);
});

test("edge: mixed rejected and released milestones stay partially_released", () => {
  const decision = derivePayoutStatusDecision({
    status: "active",
    completedAt: null,
    milestones: [
      { status: "released" },
      { status: "rejected" },
    ],
  }, NOW);
  assert.equal(decision.status, "partially_released");
  assert.equal(decision.completedAt, null);
});
