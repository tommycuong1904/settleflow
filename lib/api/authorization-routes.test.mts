import test from "node:test";
import assert from "node:assert/strict";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { GET as getPayouts } from "@/app/api/payouts/route";
import { GET as getPayoutDetail } from "@/app/api/v1/payouts/[id]/route";
import { GET as getActivity } from "@/app/api/v1/payouts/[id]/activity/route";
import { GET as getSettings } from "@/app/api/v1/settings/route";
import { GET as getDashboard } from "@/app/api/dashboard/route";
import { PUT as updateSettings } from "@/app/api/v1/settings/route";
import { POST as createPayout } from "@/app/api/v1/payouts/route";

const cookie = (token: string) => ({ cookie: `sf_session=${token}` });

async function ownerToken() {
  return createSessionToken({
    userId: "user-1",
    email: "owner@example.com",
    name: "Owner",
    address: null,
    authType: "web2_google",
  });
}

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
  const token = await ownerToken();

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

test("GET /api/v1/payouts rejects an authenticated session without a User", async () => {
  const original = db.user.findFirst;
  db.user.findFirst = (async () => null) as typeof db.user.findFirst;
  try {
    const response = await getPayouts(new Request("https://settleflow.local/api/v1/payouts", {
      headers: cookie(await ownerToken()),
    }));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "AUTH_CONTEXT_REQUIRED");
  } finally {
    db.user.findFirst = original;
  }
});

test("GET /api/v1/payouts does not fall back to email when session userId is wrong", async () => {
  const originalUser = db.user.findFirst;
  db.user.findFirst = (async () => null) as typeof db.user.findFirst;
  try {
    const response = await getPayouts(new Request("https://settleflow.local/api/v1/payouts", {
      headers: cookie(await createSessionToken({ userId: "forged-id", email: "owner@example.com", name: "Owner", address: null, authType: "web2_google" })),
    }));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "AUTH_CONTEXT_REQUIRED");
  } finally {
    db.user.findFirst = originalUser;
  }
});

test("GET /api/v1/payouts rejects an authenticated User without membership", async () => {
  const originalUser = db.user.findFirst;
  const originalMemberships = db.workspaceMember.findMany;
  db.user.findFirst = (async () => ({ id: "user-1", displayName: "Owner" })) as typeof db.user.findFirst;
  db.workspaceMember.findMany = (async () => []) as typeof db.workspaceMember.findMany;
  try {
    const response = await getPayouts(new Request("https://settleflow.local/api/v1/payouts", {
      headers: cookie(await ownerToken()),
    }));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "AUTH_CONTEXT_REQUIRED");
  } finally {
    db.user.findFirst = originalUser;
    db.workspaceMember.findMany = originalMemberships;
  }
});

test("GET /api/v1/payouts rejects an unauthorized workspace selector", async () => {
  const originalUser = db.user.findFirst;
  const originalMemberships = db.workspaceMember.findMany;
  db.user.findFirst = (async () => ({ id: "user-1", displayName: "Owner" })) as typeof db.user.findFirst;
  db.workspaceMember.findMany = (async () => [{ workspaceId: "workspace-a", role: "owner" }]) as typeof db.workspaceMember.findMany;
  try {
    const response = await getPayouts(new Request("https://settleflow.local/api/v1/payouts?workspaceId=workspace-b", {
      headers: cookie(await ownerToken()),
    }));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "AUTH_CONTEXT_REQUIRED");
  } finally {
    db.user.findFirst = originalUser;
    db.workspaceMember.findMany = originalMemberships;
  }
});

test("GET /api/v1/payouts rejects multiple memberships without a selector", async () => {
  const originalUser = db.user.findFirst;
  const originalMemberships = db.workspaceMember.findMany;
  db.user.findFirst = (async () => ({ id: "user-1", displayName: "Owner" })) as typeof db.user.findFirst;
  db.workspaceMember.findMany = (async () => [
    { workspaceId: "workspace-a", role: "reviewer" },
    { workspaceId: "workspace-b", role: "owner" },
  ]) as typeof db.workspaceMember.findMany;
  try {
    const response = await getPayouts(new Request("https://settleflow.local/api/v1/payouts", {
      headers: cookie(await ownerToken()),
    }));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "AUTH_CONTEXT_REQUIRED");
  } finally {
    db.user.findFirst = originalUser;
    db.workspaceMember.findMany = originalMemberships;
  }
});

test("GET /api/v1/payouts rejects a workspace selector outside memberships", async () => {
  const originalUser = db.user.findFirst;
  const originalMemberships = db.workspaceMember.findMany;
    db.user.findFirst = (async () => ({ id: "user-a", displayName: "User A" })) as typeof db.user.findFirst;
  db.workspaceMember.findMany = (async () => [{ workspaceId: "workspace-a", role: "owner" }]) as typeof db.workspaceMember.findMany;
  try {
    const response = await getPayouts(new Request("https://settleflow.local/api/v1/payouts?workspaceId=workspace-b", {
      headers: cookie(await ownerToken()),
    }));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "AUTH_CONTEXT_REQUIRED");
  } finally {
    db.user.findFirst = originalUser;
    db.workspaceMember.findMany = originalMemberships;
  }
});

test("GET /api/v1/payouts selects the requested membership in a multi-workspace session", async () => {
  const originalUser = db.user.findFirst;
  const originalMemberships = db.workspaceMember.findMany;
  const originalPayouts = db.payout.findMany;
    db.user.findFirst = (async () => ({ id: "user-a", displayName: "User A" })) as typeof db.user.findFirst;
  db.workspaceMember.findMany = (async () => [
    { workspaceId: "workspace-a", role: "reviewer" },
    { workspaceId: "workspace-b", role: "owner" },
  ]) as typeof db.workspaceMember.findMany;
  let observedWorkspace: string | undefined;
  db.payout.findMany = (async (args: any) => {
    observedWorkspace = args.where.workspaceId;
    return [];
  }) as typeof db.payout.findMany;
  try {
    const response = await getPayouts(new Request("https://settleflow.local/api/v1/payouts?workspaceId=workspace-b", {
      headers: cookie(await ownerToken()),
    }));
    assert.equal(response.status, 200);
    assert.equal(observedWorkspace, "workspace-b");
  } finally {
    db.user.findFirst = originalUser;
    db.workspaceMember.findMany = originalMemberships;
    db.payout.findMany = originalPayouts;
  }
});

test("GET /api/v1/payouts/[id] hides a payout belonging to another workspace", async () => {
  const originalUser = db.user.findFirst;
  const originalMemberships = db.workspaceMember.findMany;
  const originalPayout = db.payout.findFirst;
  db.user.findFirst = (async () => ({ id: "user-a", displayName: "User A" })) as typeof db.user.findFirst;
  db.workspaceMember.findMany = (async () => [{ workspaceId: "workspace-a", role: "owner" }]) as typeof db.workspaceMember.findMany;
  db.payout.findFirst = (async () => null) as typeof db.payout.findFirst;
  try {
    const response = await getPayoutDetail(new Request("https://settleflow.local/api/v1/payouts/payout-b", {
      headers: cookie(await ownerToken()),
    }), { params: Promise.resolve({ id: "payout-b" }) });
    assert.equal(response.status, 404);
  } finally {
    db.user.findFirst = originalUser;
    db.workspaceMember.findMany = originalMemberships;
    db.payout.findFirst = originalPayout;
  }
});

test("PUT /api/v1/settings enforces owner-only membership authorization", async () => {
  const originalUser = db.user.findFirst;
  const originalMemberships = db.workspaceMember.findMany;
  const originalWorkspaceUpdate = db.workspace.update;
  const run = async (role: string) => {
      db.user.findFirst = (async () => ({ id: "user-a", displayName: "User A" })) as typeof db.user.findFirst;
    db.workspaceMember.findMany = (async () => [{ workspaceId: "workspace-a", role }]) as typeof db.workspaceMember.findMany;
    db.workspace.update = (async () => ({ id: "workspace-a", webhookUrl: null, notifyOnSubmit: true, notifyOnApprove: true, notifyOnRelease: true })) as unknown as typeof db.workspace.update;
    return updateSettings(new Request("https://settleflow.local/api/v1/settings", {
      method: "PUT", headers: { ...cookie(await ownerToken()), "content-type": "application/json" },
      body: JSON.stringify({ ownerUserId: "attacker", actor: "contributor", workspaceId: "workspace-b" }),
    }));
  };
  try {
    assert.equal((await run("owner")).status, 200);
    assert.equal((await run("ops")).status, 403);
    assert.equal((await run("reviewer")).status, 403);
    assert.equal((await run("contributor")).status, 403);
  } finally {
    db.user.findFirst = originalUser;
    db.workspaceMember.findMany = originalMemberships;
    db.workspace.update = originalWorkspaceUpdate;
  }
});
