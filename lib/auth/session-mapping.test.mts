import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProductContextFromMembership,
  mapMembershipRoleToActor,
  parseCookieValue,
  parseSessionCookie,
  parseSessionCookieFromStore,
  type SessionUserInfo,
} from "./session-mapping";

const USER: SessionUserInfo = {
  id: "user-owner",
  email: "owner@settleflow.local",
  displayName: "Demo Owner",
  walletAddress: null,
};

// ── mapMembershipRoleToActor ────────────────────────────────────────────────

test("maps owner membership role to the owner actor", () => {
  assert.equal(mapMembershipRoleToActor("owner"), "owner");
});

test("maps ops membership role to the owner actor", () => {
  assert.equal(mapMembershipRoleToActor("ops"), "owner");
});

test("maps reviewer membership role to the reviewer actor", () => {
  assert.equal(mapMembershipRoleToActor("reviewer"), "reviewer");
});

test("maps contributor membership role to the contributor actor", () => {
  assert.equal(mapMembershipRoleToActor("contributor"), "contributor");
});

test("falls back to owner for an unknown membership role", () => {
  assert.equal(mapMembershipRoleToActor("admin"), "owner");
});

// ── buildProductContextFromMembership ───────────────────────────────────────

test("builds an owner product context from a real membership", () => {
  const context = buildProductContextFromMembership(USER, {
    workspaceId: "ws-demo",
    role: "owner",
  });

  assert.equal(context.workspaceId, "ws-demo");
  assert.equal(context.actor, "owner");
  assert.equal(context.activeUserId, "user-owner");
  assert.equal(context.ownerUserId, "user-owner");
  assert.equal(context.reviewerUserId, "user-owner");
  assert.equal(context.contributorUserId, "user-owner");
});

test("builds a contributor product context with contributor actor", () => {
  const context = buildProductContextFromMembership(
    { ...USER, id: "user-contrib" },
    { workspaceId: "ws-demo", role: "contributor" },
  );

  assert.equal(context.actor, "contributor");
  assert.equal(context.activeUserId, "user-contrib");
});

// ── parseSessionCookie ─────────────────────────────────────────────────────

test("reads the sf_session cookie from a request Cookie header", () => {
  const request = new Request("https://settleflow.local/api/v1/payouts", {
    headers: { cookie: "other=1; sf_session=token-value; third=2" },
  });
  assert.equal(parseSessionCookie(request), "token-value");
});

test("returns null when the sf_session cookie is absent", () => {
  const request = new Request("https://settleflow.local/api/v1/payouts", {
    headers: { cookie: "other=1" },
  });
  assert.equal(parseSessionCookie(request), null);
});

test("returns null when there is no Cookie header", () => {
  const request = new Request("https://settleflow.local/api/v1/payouts");
  assert.equal(parseSessionCookie(request), null);
});

test("reads the sf_session cookie from a cookie store", () => {
  const store = {
    get: (name: string) =>
      name === "sf_session" ? { value: "store-token" } : undefined,
  };
  assert.equal(parseSessionCookieFromStore(store), "store-token");
});

test("returns null from a cookie store without sf_session", () => {
  const store = { get: () => undefined };
  assert.equal(parseSessionCookieFromStore(store), null);
});

test("parseCookieValue is case-sensitive on the cookie name", () => {
  assert.equal(parseCookieValue("SF_SESSION=1; sf_session=2", "sf_session"), "2");
  assert.equal(parseCookieValue("sf_session=1", "other"), null);
});