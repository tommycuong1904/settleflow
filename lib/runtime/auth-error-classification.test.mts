import test from "node:test";
import assert from "node:assert/strict";

import { classifyFrontendAuthError } from "@/lib/runtime/auth-error-classification";

test("classifies authentication-required errors separately", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_REQUIRED")), "auth-required");
});

test("classifies missing workspace context as an auth-context error", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_CONTEXT_REQUIRED")), "auth-context-required");
});

test("classifies role ambiguity as an auth-context error", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_ROLE_AMBIGUOUS")), "auth-role-ambiguous");
});

test("classifies network and unexpected errors as server errors", () => {
  assert.equal(classifyFrontendAuthError(new Error("Failed to fetch")), "server-error");
  assert.equal(classifyFrontendAuthError(new TypeError("network failure")), "server-error");
  assert.equal(classifyFrontendAuthError(null), "server-error");
});

// The production App Router may redact server-thrown messages to a digest;
// a digest alone is intentionally not treated as an auth classification.
test("does not guess an auth class from an opaque SSR error", () => {
  assert.equal(classifyFrontendAuthError({ digest: "opaque" }), "server-error");
});


test("keeps the auth-context presentation separate from generic server errors", () => {
  assert.notEqual(
    classifyFrontendAuthError(new Error("AUTH_CONTEXT_REQUIRED")),
    classifyFrontendAuthError(new Error("DATABASE_UNAVAILABLE")),
  );
});


test("keeps role ambiguity separate from unauthenticated state", () => {
  assert.notEqual(
    classifyFrontendAuthError(new Error("AUTH_ROLE_AMBIGUOUS")),
    classifyFrontendAuthError(new Error("AUTH_REQUIRED")),
  );
});


test("does not treat arbitrary messages containing auth words as auth codes", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_CONTEXT_REQUIRED: details")), "server-error");
});


test("preserves network classification when an Error has a digest", () => {
  const error = Object.assign(new Error("Failed to fetch"), { digest: "network-digest" });
  assert.equal(classifyFrontendAuthError(error), "server-error");
});


test("preserves exact code matching for authentication errors", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_REQUIRED")), "auth-required");
  assert.equal(classifyFrontendAuthError(new Error("AUTH_REQUIRED ")), "server-error");
});


test("preserves exact code matching for context errors", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_CONTEXT_REQUIRED")), "auth-context-required");
  assert.equal(classifyFrontendAuthError(new Error("auth_context_required")), "server-error");
});


test("preserves exact code matching for role ambiguity", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_ROLE_AMBIGUOUS")), "auth-role-ambiguous");
  assert.equal(classifyFrontendAuthError(new Error("AUTH_ROLE_AMBIGUOUS ")), "server-error");
});


test("classifies primitive and rejected values as server errors", () => {
  assert.equal(classifyFrontendAuthError("AUTH_REQUIRED"), "server-error");
  assert.equal(classifyFrontendAuthError({ message: "AUTH_CONTEXT_REQUIRED" }), "server-error");
  assert.equal(classifyFrontendAuthError(undefined), "server-error");
});


test("does not classify HTTP status text without the domain code", () => {
  assert.equal(classifyFrontendAuthError(new Error("403 Forbidden")), "server-error");
  assert.equal(classifyFrontendAuthError(new Error("401 Unauthorized")), "server-error");
});


test("does not classify an empty error message as authentication", () => {
  assert.equal(classifyFrontendAuthError(new Error("")), "server-error");
});


test("classifies only the three supported auth codes", () => {
  for (const code of ["AUTH_REQUIRED", "AUTH_CONTEXT_REQUIRED", "AUTH_ROLE_AMBIGUOUS"] as const) {
    assert.notEqual(classifyFrontendAuthError(new Error(code)), "server-error");
  }
});

test("keeps opaque SSR errors fail-closed", () => {
  assert.equal(classifyFrontendAuthError(new Error("digest-only")), "server-error");
});

test("does not turn a generic server error into a sign-in prompt", () => {
  assert.equal(classifyFrontendAuthError(new Error("Internal Server Error")), "server-error");
});

test("recognizes context errors only at the exact domain boundary", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_CONTEXT_REQUIRED")), "auth-context-required");
  assert.equal(classifyFrontendAuthError(new Error("AUTH_CONTEXT_REQUIRED\n")), "server-error");
});

test("recognizes role ambiguity only at the exact domain boundary", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_ROLE_AMBIGUOUS")), "auth-role-ambiguous");
  assert.equal(classifyFrontendAuthError(new Error("AUTH_ROLE_AMBIGUOUS\n")), "server-error");
});

test("recognizes unauthenticated state only at the exact domain boundary", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_REQUIRED")), "auth-required");
  assert.equal(classifyFrontendAuthError(new Error("AUTH_REQUIRED\n")), "server-error");
});

test("classifier returns a stable finite set", () => {
  const values = new Set([
    classifyFrontendAuthError(new Error("AUTH_REQUIRED")),
    classifyFrontendAuthError(new Error("AUTH_CONTEXT_REQUIRED")),
    classifyFrontendAuthError(new Error("AUTH_ROLE_AMBIGUOUS")),
    classifyFrontendAuthError(new Error("other")),
  ]);
  assert.deepEqual([...values].sort(), ["auth-context-required", "auth-required", "auth-role-ambiguous", "server-error"]);
});

test("does not infer context from unrelated error metadata", () => {
  const error = Object.assign(new Error("Database failure"), { code: "AUTH_CONTEXT_REQUIRED" });
  assert.equal(classifyFrontendAuthError(error), "server-error");
});

test("does not infer authentication from an HTTP response-like object", () => {
  assert.equal(classifyFrontendAuthError({ status: 401, code: "AUTH_REQUIRED" }), "server-error");
});

test("keeps authorization role errors out of the generic auth-required branch", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_ROLE_AMBIGUOUS")), "auth-role-ambiguous");
  assert.notEqual(classifyFrontendAuthError(new Error("AUTH_ROLE_AMBIGUOUS")), "auth-required");
});

test("keeps context errors out of the generic server-error branch", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_CONTEXT_REQUIRED")), "auth-context-required");
  assert.notEqual(classifyFrontendAuthError(new Error("AUTH_CONTEXT_REQUIRED")), "server-error");
});

test("keeps unauthenticated errors out of the context branch", () => {
  assert.equal(classifyFrontendAuthError(new Error("AUTH_REQUIRED")), "auth-required");
  assert.notEqual(classifyFrontendAuthError(new Error("AUTH_REQUIRED")), "auth-context-required");
});

test("handles cross-realm-like error-shaped values conservatively", () => {
  assert.equal(classifyFrontendAuthError({ name: "Error", message: "AUTH_REQUIRED" }), "server-error");
});

test("does not use status numbers as a substitute for domain codes", () => {
  assert.equal(classifyFrontendAuthError(new Error("403")), "server-error");
  assert.equal(classifyFrontendAuthError(new Error("401")), "server-error");
});

test("keeps arbitrary network messages generic", () => {
  assert.equal(classifyFrontendAuthError(new Error("NetworkError when attempting to fetch resource.")), "server-error");
});

test("keeps auth code case-sensitive", () => {
  assert.equal(classifyFrontendAuthError(new Error("auth_required")), "server-error");
  assert.equal(classifyFrontendAuthError(new Error("Auth_required")), "server-error");
});

test("does not expose implementation details through the classifier", () => {
  assert.equal(classifyFrontendAuthError(new Error("PrismaClientKnownRequestError")), "server-error");
});

test("recognizes valid codes despite Error subclasses", () => {
  class DomainError extends Error {}
  assert.equal(classifyFrontendAuthError(new DomainError("AUTH_CONTEXT_REQUIRED")), "auth-context-required");
});

test("recognizes valid codes when Error cause is present", () => {
  const error = Object.assign(new Error("AUTH_ROLE_AMBIGUOUS"), { cause: new Error("nested") });
  assert.equal(classifyFrontendAuthError(error), "auth-role-ambiguous");
});

test("rejects blank and whitespace messages", () => {
  assert.equal(classifyFrontendAuthError(new Error(" ")), "server-error");
  assert.equal(classifyFrontendAuthError(new Error("\t")), "server-error");
});

test("keeps classifier deterministic for repeated calls", () => {
  const error = new Error("AUTH_CONTEXT_REQUIRED");
  assert.equal(classifyFrontendAuthError(error), classifyFrontendAuthError(error));
});
