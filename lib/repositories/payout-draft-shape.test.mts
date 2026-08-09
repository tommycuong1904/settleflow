import test from "node:test";
import assert from "node:assert/strict";

import { deriveCreatePayoutMilestonePayloads } from "./payout-creation";
import { deriveDraftUpdateActivityMetadata } from "./payout-editing";

test("create payout milestone payloads preserve authored order and fields", () => {
  const payloads = deriveCreatePayoutMilestonePayloads([
    { title: "M1", description: "First", amountUsdc: "25", sequence: 2 },
    { title: "M0", description: "Zeroth", amountUsdc: "75", sequence: 1 },
  ]);

  assert.deepEqual(payloads, [
    { title: "M1", description: "First", amountUsdc: "25", sequence: 2 },
    { title: "M0", description: "Zeroth", amountUsdc: "75", sequence: 1 },
  ]);
});

test("draft update metadata distinguishes header vs milestone changes", () => {
  const metadata = deriveDraftUpdateActivityMetadata(
    {
      title: "New title",
      contributorId: "c2",
      milestones: [
        { title: "M1", description: "Desc", amountUsdc: "50", sequence: 1 },
      ],
    },
    "c1",
  );

  assert.deepEqual(metadata, {
    changedFields: ["title", "contributorId", "milestones"],
    headerChangedFields: ["title", "contributorId"],
    headerChanged: "true",
    milestonesChanged: "true",
    contributorChanged: "true",
    milestoneCount: 1,
  });
});

test("draft update metadata leaves contributorChanged undefined when contributor untouched", () => {
  const metadata = deriveDraftUpdateActivityMetadata(
    { description: "Only description changed" },
    "c1",
  );

  assert.deepEqual(metadata, {
    changedFields: ["description"],
    headerChangedFields: ["description"],
    headerChanged: "true",
    milestonesChanged: "false",
    contributorChanged: undefined,
    milestoneCount: undefined,
  });
});
