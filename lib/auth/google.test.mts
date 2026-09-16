import test from "node:test";
import assert from "node:assert/strict";

import { decodeGoogleJwt } from "./google";

function unsignedIdToken(payload: Record<string, unknown>) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

test("client Google profile requires the stable Google subject", () => {
  assert.deepEqual(
    decodeGoogleJwt(unsignedIdToken({ sub: "google-sub-123", email: "user@example.test", name: "User" })),
    { sub: "google-sub-123", email: "user@example.test", name: "User", picture: undefined, emailVerified: undefined },
  );
  assert.equal(decodeGoogleJwt(unsignedIdToken({ email: "user@example.test" })), null);
});
