import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken } from "@/lib/auth/session";

const env = process.env as Record<string, string | undefined>;
env.CIRCLE_USER_CONTROLLED_ENABLED = "true";
env.CIRCLE_USER_CONTROLLED_API_KEY = "test-circle-key";
env.NEXT_PUBLIC_CIRCLE_USER_CONTROLLED_APP_ID = "test-circle-app";

const challengeModule = await import(
  new URL("../../app/api/v1/releases/[id]/circle/challenge/route.ts", import.meta.url).href + `?context=${Date.now()}`
);
const completeModule = await import(
  new URL("../../app/api/v1/releases/[id]/circle/complete/route.ts", import.meta.url).href + `?context=${Date.now()}`
);

const challenge = challengeModule.POST as (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
const complete = completeModule.POST as (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

test("Circle release endpoints reject a signed Google session without a workspace membership before provider access", async () => {
  const token = await createSessionToken({
    userId: "missing-circle-release-member",
    email: "missing-circle-release-member@example.test",
    name: "Missing Circle Release Member",
    address: null,
    authType: "web2_google",
  });
  const headers = { cookie: `sf_session=${token}`, "content-type": "application/json" };
  const params = { params: Promise.resolve({ id: "missing" }) };

  for (const response of await Promise.all([
    challenge(new Request("https://settleflow.local/api/v1/releases/missing/circle/challenge", {
      method: "POST", headers, body: JSON.stringify({ userToken: "provider-token-must-not-be-used" }),
    }), params),
    complete(new Request("https://settleflow.local/api/v1/releases/missing/circle/complete", {
      method: "POST", headers, body: JSON.stringify({ userToken: "provider-token-must-not-be-used" }),
    }), params),
  ])) {
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "AUTH_CONTEXT_REQUIRED");
  }
});
