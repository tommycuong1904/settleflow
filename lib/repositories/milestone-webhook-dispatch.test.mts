import test from "node:test";
import assert from "node:assert/strict";

import { db } from "../db/client";
import { submitMilestone } from "./milestone-submission";
import { reviewMilestone } from "./milestone-review";
import { queueMilestoneRelease } from "./milestone-release";
import type { WebhookPayload } from "../notifications/webhook-dispatcher";

type NotifySpy = (payload: WebhookPayload) => Promise<{ success: boolean; error?: string }>;

function makeNotifySpy(calls: WebhookPayload[]): NotifySpy {
  return async (payload) => {
    calls.push(payload);
    return { success: true };
  };
}

function stubTransaction(result: unknown) {
  const original = db.$transaction;
  db.$transaction = (async () => result) as unknown as typeof db.$transaction;
  return () => {
    db.$transaction = original;
  };
}

test("submitMilestone calls injected notify with milestone_submitted event", async () => {
  const restore = stubTransaction({
    milestone: { id: "m1", status: "submitted" },
    submission: { id: "s1", submittedAt: new Date() },
    payoutTitle: "Test Payout",
    milestoneTitle: "Test Milestone",
    amountUsdc: "2500",
  });

  const calls: WebhookPayload[] = [];
  try {
    await submitMilestone(
      "m1",
      "ws1",
      { contributorUserId: "u1", summary: "Work done" },
      makeNotifySpy(calls),
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].event, "milestone_submitted");
    assert.equal(calls[0].payoutTitle, "Test Payout");
    assert.equal(calls[0].milestoneTitle, "Test Milestone");
    assert.equal(calls[0].amountUsdc, "2500");
    assert.equal(calls[0].summary, "Work done");
  } finally {
    restore();
  }
});

test("reviewMilestone calls injected notify with milestone_approved event", async () => {
  const restore = stubTransaction({
    milestone: { id: "m1", status: "approved", approvedAt: new Date(), rejectedAt: null },
    review: { id: "r1", decision: "approved" },
    payoutTitle: "Test Payout",
    milestoneTitle: "Test Milestone",
    amountUsdc: "2500",
  });

  const calls: WebhookPayload[] = [];
  try {
    await reviewMilestone("m1", "u2", "ws1", "approved", undefined, makeNotifySpy(calls));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].event, "milestone_approved");
    assert.equal(calls[0].payoutTitle, "Test Payout");
    assert.equal(calls[0].milestoneTitle, "Test Milestone");
    assert.equal(calls[0].amountUsdc, "2500");
  } finally {
    restore();
  }
});

test("reviewMilestone calls injected notify with milestone_rejected event and comment", async () => {
  const restore = stubTransaction({
    milestone: { id: "m1", status: "rejected", approvedAt: null, rejectedAt: new Date() },
    review: { id: "r1", decision: "rejected" },
    payoutTitle: "Test Payout",
    milestoneTitle: "Test Milestone",
    amountUsdc: "2500",
  });

  const calls: WebhookPayload[] = [];
  try {
    await reviewMilestone("m1", "u2", "ws1", "rejected", "Needs revision", makeNotifySpy(calls));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].event, "milestone_rejected");
    assert.equal(calls[0].comment, "Needs revision");
  } finally {
    restore();
  }
});

test("queueMilestoneRelease calls injected notify with milestone_released event", async () => {
  const restore = stubTransaction({
    release: { id: "rel1", status: "queued" },
    proof: { id: "pr1", status: "pending" },
    payoutTitle: "Test Payout",
    milestoneTitle: "Test Milestone",
    amountUsdc: "2500",
    recipientAddress: "0xdest",
  });

  const calls: WebhookPayload[] = [];
  try {
    await queueMilestoneRelease("m1", "u3", "ws1", "2500", "browser_wallet", makeNotifySpy(calls));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].event, "milestone_released");
    assert.equal(calls[0].payoutTitle, "Test Payout");
    assert.equal(calls[0].milestoneTitle, "Test Milestone");
    assert.equal(calls[0].amountUsdc, "2500");
    assert.equal(calls[0].recipientAddress, "0xdest");
  } finally {
    restore();
  }
});