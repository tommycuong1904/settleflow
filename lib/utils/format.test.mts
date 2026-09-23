import assert from "node:assert/strict";
import test from "node:test";

import { formatUsdc } from "./format";

test("formats fractional USDC amounts without rounding them to zero", () => {
  assert.equal(formatUsdc(0.1), "0.1");
  assert.equal(formatUsdc(0.2), "0.2");
  assert.equal(formatUsdc(12.345678), "12.345678");
});
