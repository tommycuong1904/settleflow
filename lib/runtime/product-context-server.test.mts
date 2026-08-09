import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveProductContextFromRequest,
  resolveProductContextFromCookies,
  resolveWorkspaceId,
} from "./product-context-server";

test("resolveWorkspaceId falls back to default only for empty values", () => {
  assert.equal(resolveWorkspaceId("workspace-1"), "workspace-1");
  assert.equal(resolveWorkspaceId("   "), "ws-demo");
  assert.equal(resolveWorkspaceId(undefined), "ws-demo");
});

test("request context prefers headers over cookies and query params", () => {
  const request = new Request(
    "https://example.test/api/v1/payouts?actor=contributor&ownerUserId=query-owner&workspaceId=query-workspace",
    {
      headers: {
        cookie: [
          "sf_actor=reviewer",
          "sf_owner_user_id=cookie-owner",
          "sf_workspace_id=cookie-workspace",
        ].join("; "),
        "x-settleflow-actor": "owner",
        "x-settleflow-owner-user-id": "header-owner",
        "x-settleflow-workspace-id": "header-workspace",
      },
    },
  );

  const context = resolveProductContextFromRequest(request);

  assert.equal(context.actor, "owner");
  assert.equal(context.ownerUserId, "header-owner");
  assert.equal(context.workspaceId, "header-workspace");
  assert.equal(context.activeUserId, "header-owner");
});

test("request context falls back from cookies to query params when headers absent", () => {
  const request = new Request(
    "https://example.test/api/v1/payouts?contributorUserId=query-contributor&workspaceId=query-workspace",
    {
      headers: {
        cookie: "sf_actor=contributor; sf_workspace_id=cookie-workspace",
      },
    },
  );

  const context = resolveProductContextFromRequest(request);

  assert.equal(context.actor, "contributor");
  assert.equal(context.workspaceId, "cookie-workspace");
  assert.equal(context.contributorUserId, "query-contributor");
  assert.equal(context.activeUserId, "query-contributor");
});

test("cookie-store context resolves named values directly", () => {
  const cookieStore = {
    get(name: string) {
      const values: Record<string, { value: string }> = {
        sf_actor: { value: "reviewer" },
        sf_owner_user_id: { value: "owner-1" },
        sf_reviewer_user_id: { value: "reviewer-1" },
        sf_contributor_user_id: { value: "contributor-1" },
        sf_workspace_id: { value: "workspace-1" },
      };

      return values[name];
    },
  };

  const context = resolveProductContextFromCookies(cookieStore);

  assert.equal(context.actor, "reviewer");
  assert.equal(context.activeUserId, "reviewer-1");
  assert.equal(context.workspaceId, "workspace-1");
});
