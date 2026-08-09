import test from "node:test";
import assert from "node:assert/strict";

import {
  contributorStatuses,
  isValidEnumQueryValue,
  parseEnumQueryValue,
  payoutStatuses,
} from "./list-query";

test("isValidEnumQueryValue accepts null and allowed values only", () => {
  assert.equal(isValidEnumQueryValue(null, payoutStatuses), true);
  assert.equal(isValidEnumQueryValue("draft", payoutStatuses), true);
  assert.equal(isValidEnumQueryValue("bad", payoutStatuses), false);
});

test("parseEnumQueryValue returns typed values or undefined", () => {
  assert.equal(parseEnumQueryValue("active", contributorStatuses), "active");
  assert.equal(parseEnumQueryValue("archived", contributorStatuses), "archived");
  assert.equal(parseEnumQueryValue("weird", contributorStatuses), undefined);
  assert.equal(parseEnumQueryValue(null, contributorStatuses), undefined);
});
