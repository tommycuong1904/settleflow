import test from "node:test";
import assert from "node:assert/strict";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { GET as getPayouts } from "@/app/api/payouts/route";
import { GET as getPayoutDetail } from "@/app/api/v1/payouts/[id]/route";
import { GET as getActivity } from "@/app/api/v1/payouts/[id]/activity/route";
import { GET as getSettings } from "@/app/api/v1/settings/route";
import { GET as getDashboard } from "@/app/api/dashboard/route";

const cookie = (token: string) => ({ cookie: `sf_session=${token}` });

async function assertUnauthorized(handler: (request: Request, ...args: any[]) => Promise<Response>, url: string, ...args: any[]) {
  const response = await handler(new Request(`https://settleflow.local${url}`), ...args);
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.code, "AUTH_REQUIRED");
}

test("protected GET handlers reject missing sessions", async () => {
  await assertUnauthorized(getPayouts, "/api/v1/payouts");
  await assertUnauthorized(getPayoutDetail, "/api/v1/payouts/p1", { params: Promise.resolve({ id: "p1" }) });
  await assertUnauthorized(getActivity, "/api/v1/payouts/p1/activity", { params: Promise.resolve({ id: "p1" }) });
  await assertUnauthorized(getSettings, "/api/v1/settings");
  await assertUnauthorized(getDashboard, "/api/v1/dashboard");
});

test("GET /api/v1/payouts rejects an invalid session", async () => {
  const response = await getPayouts(new Request("https://settleflow.local/api/v1/payouts", {
    headers: cookie("tampered.invalid"),
  }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "AUTH_REQUIRED");
});

test("GET /api/v1/payouts uses the authorized membership workspace", async () => {
  const token = await createSessionToken({
    userId: "session-user",
    email: "owner@example.com",
    name: "Owner",
    address: null,
    authType: "web2_google",
  });

  const originalUserFindFirst = db.user.findFirst;
  const originalMembershipFindMany = db.workspaceMember.findMany;
  const originalPayoutFindMany = db.payout.findMany;

  db.user.findFirst = (async () => ({ id: "user-1", displayName: "Owner" })) as typeof db.user.findFirst;
  db.workspaceMember.findMany = (async () => [{ workspaceId: "workspace-a", role: "owner" }]) as typeof db.workspaceMember.findMany;
  let observedWorkspace: string | undefined;
  db.payout.findMany = (async (args: any) => {
    observedWorkspace = args.where.workspaceId;
    return [];
  }) as typeof db.payout.findMany;

  try {
    const response = await getPayouts(new Request("https://settleflow.local/api/v1/payouts?workspaceId=workspace-a&actor=contributor", {
      headers: cookie(token),
    }));
    assert.equal(response.status, 200);
    assert.equal(observedWorkspace, "workspace-a");
  } finally {
    db.user.findFirst = originalUserFindFirst;
    db.workspaceMember.findMany = originalMembershipFindMany;
    db.payout.findMany = originalPayoutFindMany;
  }
});
