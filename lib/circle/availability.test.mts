import assert from "node:assert/strict";
import test from "node:test";

import { POST as provisionCircleWallet } from "@/app/api/v1/circle/wallet/route";
import { POST as completeCircleWallet } from "@/app/api/v1/circle/wallet/complete/route";
import { POST as createCircleSocialToken } from "@/app/api/v1/circle/wallet/social-token/route";
import { POST as createCircleReleaseChallenge } from "@/app/api/v1/releases/[id]/circle/challenge/route";
import { POST as completeCircleRelease } from "@/app/api/v1/releases/[id]/circle/complete/route";
import { CIRCLE_SMART_WALLET_AVAILABLE } from "./availability";

const testWhenCircleIsDisabled = CIRCLE_SMART_WALLET_AVAILABLE ? test.skip : test;

testWhenCircleIsDisabled("Circle Smart Wallet remains closed without an explicit enabled Testnet configuration", async () => {
  assert.equal(CIRCLE_SMART_WALLET_AVAILABLE, false);
  const request = new Request("https://settleflow.local/api/v1/circle/wallet", { method: "POST" });
  const params = { params: Promise.resolve({ id: "release-1" }) };
  for (const response of await Promise.all([
    provisionCircleWallet(request),
    completeCircleWallet(request),
    createCircleSocialToken(request),
    createCircleReleaseChallenge(request, params),
    completeCircleRelease(request, params),
  ])) {
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "CIRCLE_SMART_WALLET_COMING_SOON");
  }
});
