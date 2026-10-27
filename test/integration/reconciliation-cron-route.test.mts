import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "@/app/api/v1/cron/reconcile-releases/route";

test("reconciliation cron fails closed without its configured bearer secret", async () => {
  const original = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-cron-secret";
  try {
    const response = await GET(new Request("https://settleflow.local/api/v1/cron/reconcile-releases"));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "CRON_UNAUTHORIZED" });
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  }
});
