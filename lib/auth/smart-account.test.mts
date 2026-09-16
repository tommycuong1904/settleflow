import test from "node:test";
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";

import { deriveDeterministicPrivateKey, deriveSmartAccountAddress } from "./smart-account";

test("the exported key derives the same address as the Google smart account", () => {
  const googleSub = "google-subject-123";

  assert.equal(
    privateKeyToAccount(deriveDeterministicPrivateKey(googleSub)).address,
    deriveSmartAccountAddress(googleSub),
  );
});
