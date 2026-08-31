import assert from "node:assert/strict";
import test from "node:test";

test("public real mode cannot authorize server execution without server gate", async () => {
  const env = process.env as Record<string, string | undefined>;
  const previousMode = env.NEXT_PUBLIC_ARC_EXECUTION_MODE;
  const previousGate = env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION;
  env.NEXT_PUBLIC_ARC_EXECUTION_MODE = "real";
  delete env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION;
  try {
    const moduleUrl = new URL("./send.ts", import.meta.url).href + `?gate=${Date.now()}`;
    const { sendUsdcOnArc } = await import(moduleUrl);
    const result = await sendUsdcOnArc({ recipient: "0x1", amount: "1", tokenAddress: "0x2", executionMode: "circle_wallet" });
    assert.equal(result.status, "failed");
    assert.match(result.errorMessage ?? "", /not authorized/);
  } finally {
    if (previousMode === undefined) delete env.NEXT_PUBLIC_ARC_EXECUTION_MODE; else env.NEXT_PUBLIC_ARC_EXECUTION_MODE = previousMode;
    if (previousGate === undefined) delete env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION; else env.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION = previousGate;
  }
});
