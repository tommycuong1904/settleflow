import assert from "node:assert/strict";
import test from "node:test";

import { getPostSignInDestination } from "./post-sign-in-destination";

test("an invitation return skips automatic payment-account onboarding", () => {
  assert.equal(
    getPostSignInDestination("/accept-invite?token=invite-token", true),
    "/accept-invite?token=invite-token",
  );
});

test("other new Google sign-ins still start payment-account onboarding", () => {
  assert.equal(
    getPostSignInDestination("/payouts/payout-1", true),
    "/settings?onboarding=1&next=%2Fpayouts%2Fpayout-1",
  );
});

test("unsafe return paths fall back to the dashboard", () => {
  assert.equal(getPostSignInDestination("//outside.example", true), "/settings?onboarding=1&next=%2Fdashboard");
});
