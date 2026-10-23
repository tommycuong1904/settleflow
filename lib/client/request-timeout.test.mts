import assert from "node:assert/strict";
import test from "node:test";

import { createRequestTimeout } from "@/lib/client/request-timeout";

test("request timeout aborts its signal", async () => {
  const timeout = createRequestTimeout(5);
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(timeout.signal.aborted, true);
});

test("clearing a request timeout prevents abort", async () => {
  const timeout = createRequestTimeout(5);
  timeout.clear();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(timeout.signal.aborted, false);
});
