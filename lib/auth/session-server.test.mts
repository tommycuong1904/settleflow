import test from "node:test";
import assert from "node:assert/strict";

import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { resolveWorkspaceIdFromRequestWithSession } from "@/lib/auth/session-server";

const sessionUserId = "phase2-user";
const sessionEmail = "phase2@example.com";
const session = () => createSessionToken({
  userId: sessionUserId,
  email: sessionEmail,
  name: "Phase 2",
  address: null,
  authType: "web2_google",
});

async function withDbMocks<T>(
  memberships: Array<{ workspaceId: string; role: string }>,
  callback: () => Promise<T>,
): Promise<T> {
  const originalUser = db.user.findFirst;
  const originalMemberships = db.workspaceMember.findMany;
  db.user.findFirst = (async () => ({
    id: sessionUserId,
    email: sessionEmail,
    displayName: "Phase 2",
    walletAddress: null,
  })) as typeof db.user.findFirst;
  db.workspaceMember.findMany = (async () => memberships) as typeof db.workspaceMember.findMany;
  try {
    return await callback();
  } finally {
    db.user.findFirst = originalUser;
    db.workspaceMember.findMany = originalMemberships;
  }
}

function request(url: string, cookie?: string, header?: string): Request {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `sf_session=${cookie}; sf_workspace_id=cookie-workspace`);
  if (header) headers.set("x-settleflow-workspace-id", header);
  return new Request(url, { headers });
}

test("workspace resolver precedence is query over header over cookie", async () => {
  const token = await session();
  await withDbMocks([
    { workspaceId: "query-workspace", role: "owner" },
    { workspaceId: "header-workspace", role: "owner" },
    { workspaceId: "cookie-workspace", role: "owner" },
  ], async () => {
    assert.equal(await resolveWorkspaceIdFromRequestWithSession(
      request("https://settleflow.local/api?workspaceId=query-workspace", token, "header-workspace"),
    ), "query-workspace");
  });
});

test("workspace resolver precedence is header over cookie", async () => {
  const token = await session();
  await withDbMocks([
    { workspaceId: "header-workspace", role: "owner" },
    { workspaceId: "cookie-workspace", role: "owner" },
  ], async () => {
    assert.equal(await resolveWorkspaceIdFromRequestWithSession(
      request("https://settleflow.local/api", token, "header-workspace"),
    ), "header-workspace");
  });
});

test("workspace resolver reads sf_workspace_id cookie and membership-checks it", async () => {
  const token = await session();
  await withDbMocks([{ workspaceId: "cookie-workspace", role: "owner" }], async () => {
    assert.equal(await resolveWorkspaceIdFromRequestWithSession(
      request("https://settleflow.local/api", token),
    ), "cookie-workspace");
  });
});

test("workspace resolver rejects a selector outside memberships", async () => {
  const token = await session();
  await withDbMocks([{ workspaceId: "allowed-workspace", role: "owner" }], async () => {
    await assert.rejects(
      resolveWorkspaceIdFromRequestWithSession(request("https://settleflow.local/api?workspaceId=wrong-workspace", token)),
      /AUTH_CONTEXT_REQUIRED/,
    );
  });
});

test("workspace resolver preserves multi-workspace no-selector behavior", async () => {
  const token = await session();
  await withDbMocks([
    { workspaceId: "workspace-a", role: "owner" },
    { workspaceId: "workspace-b", role: "owner" },
  ], async () => {
    await assert.rejects(
      resolveWorkspaceIdFromRequestWithSession(request("https://settleflow.local/api", token)),
      /AUTH_CONTEXT_REQUIRED/,
    );
  });
});

test("workspace resolver selects an authorized workspace in a multi-workspace session", async () => {
  const token = await session();
  await withDbMocks([
    { workspaceId: "workspace-a", role: "reviewer" },
    { workspaceId: "workspace-b", role: "owner" },
  ], async () => {
    assert.equal(await resolveWorkspaceIdFromRequestWithSession(
      request("https://settleflow.local/api?workspaceId=workspace-b", token),
    ), "workspace-b");
  });
});

test("workspace resolver rejects an unauthorized workspace in a multi-workspace session", async () => {
  const token = await session();
  await withDbMocks([
    { workspaceId: "workspace-a", role: "reviewer" },
    { workspaceId: "workspace-b", role: "owner" },
  ], async () => {
    await assert.rejects(
      resolveWorkspaceIdFromRequestWithSession(request("https://settleflow.local/api?workspaceId=workspace-c", token)),
      /AUTH_CONTEXT_REQUIRED/,
    );
  });
});

test("workspace resolver safely rejects a corrupted duplicate membership", async () => {
  const token = await session();
  await withDbMocks([
    { workspaceId: "workspace-a", role: "owner" },
    { workspaceId: "workspace-a", role: "reviewer" },
  ], async () => {
    await assert.rejects(
      resolveWorkspaceIdFromRequestWithSession(request("https://settleflow.local/api?workspaceId=workspace-a", token)),
      /AUTH_CONTEXT_REQUIRED/,
    );
  });
});
