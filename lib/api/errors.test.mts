import test from "node:test";
import assert from "node:assert/strict";

import { apiError, apiErrorFromCode } from "./errors";

test("apiError defaults to 500 and echoes code when no message provided", async () => {
  const response = apiError("SOMETHING_BROKE");
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.deepEqual(body, {
    error: "SOMETHING_BROKE",
    code: "SOMETHING_BROKE",
  });
});

test("apiError uses explicit message and status when provided", async () => {
  const response = apiError("PAYOUT_NOT_FOUND", {
    message: "Payout not found.",
    status: 404,
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(body, {
    error: "Payout not found.",
    code: "PAYOUT_NOT_FOUND",
  });
});

test("apiErrorFromCode prefers mapped status/message before fallback", async () => {
  const mapped = apiErrorFromCode(
    "USER_NOT_FOUND",
    { USER_NOT_FOUND: 404 },
    { USER_NOT_FOUND: "Owner context user not found." },
    { status: 400, message: "Fallback message" },
  );
  const mappedBody = await mapped.json();

  assert.equal(mapped.status, 404);
  assert.deepEqual(mappedBody, {
    error: "Owner context user not found.",
    code: "USER_NOT_FOUND",
  });

  const fallback = apiErrorFromCode(
    "UNKNOWN_CODE",
    { USER_NOT_FOUND: 404 },
    { USER_NOT_FOUND: "Owner context user not found." },
    { status: 422, message: "Unknown route error." },
  );
  const fallbackBody = await fallback.json();

  assert.equal(fallback.status, 422);
  assert.deepEqual(fallbackBody, {
    error: "Unknown route error.",
    code: "UNKNOWN_CODE",
  });
});

test("apiErrorFromCode returns 403 for a missing authorized session context", async () => {
  const response = apiErrorFromCode("AUTH_CONTEXT_REQUIRED", {}, {}, { status: 500 });
  assert.equal(response.status, 403);
});
