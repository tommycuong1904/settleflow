/**
 * Unit tests for contributor validation logic.
 * Tests isValidEvmAddress logic and createContributor input constraints
 * without hitting the database.
 */

import test from "node:test";
import assert from "node:assert/strict";

// ── EVM address validator (extracted for testing) ──────────────────────────
function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

// Simulates the pre-DB validation that createContributor performs
function validateContributorInput(input: {
  name?: string;
  walletAddress: string;
}): string | null {
  const name = (input.name ?? "").trim();
  const walletAddress = input.walletAddress.trim();

  if (!name) return "Contributor name is required.";
  if (!isValidEvmAddress(walletAddress)) {
    return "Invalid EVM wallet address. Must start with 0x and have 40 hexadecimal characters.";
  }
  return null;
}

// ── EVM Address Format Tests ───────────────────────────────────────────────

test("accepts a valid 42-character lowercase EVM address", () => {
  assert.equal(isValidEvmAddress("0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7"), true);
});

test("accepts a valid 42-character checksummed EVM address", () => {
  assert.equal(isValidEvmAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F"), true);
});

test("rejects an address shorter than 42 characters", () => {
  assert.equal(isValidEvmAddress("0x1234567890abcdef"), false);
});

test("rejects an address longer than 42 characters", () => {
  assert.equal(isValidEvmAddress("0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7ff"), false);
});

test("rejects an address missing the 0x prefix", () => {
  assert.equal(isValidEvmAddress("89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7"), false);
});

test("rejects an address with invalid hex characters", () => {
  assert.equal(isValidEvmAddress("0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43zz"), false);
});

test("rejects an empty string", () => {
  assert.equal(isValidEvmAddress(""), false);
});

test("rejects whitespace-only string", () => {
  assert.equal(isValidEvmAddress("   "), false);
});

test("accepts valid address with surrounding whitespace (trimmed)", () => {
  assert.equal(isValidEvmAddress("  0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7  "), true);
});

// ── Contributor Input Validation Tests ────────────────────────────────────

test("validation passes for valid name and wallet", () => {
  const result = validateContributorInput({
    name: "Alice Builder",
    walletAddress: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
  });
  assert.equal(result, null);
});

test("validation fails when name is empty", () => {
  const result = validateContributorInput({
    name: "",
    walletAddress: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
  });
  assert.equal(result, "Contributor name is required.");
});

test("validation fails when name is only whitespace", () => {
  const result = validateContributorInput({
    name: "   ",
    walletAddress: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
  });
  assert.equal(result, "Contributor name is required.");
});

test("validation fails when name is missing", () => {
  const result = validateContributorInput({
    walletAddress: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
  });
  assert.equal(result, "Contributor name is required.");
});

test("validation fails for invalid wallet address", () => {
  const result = validateContributorInput({
    name: "Bob Dev",
    walletAddress: "not-a-wallet",
  });
  assert.match(result ?? "", /Invalid EVM wallet address/);
});

test("validation fails when wallet is too short", () => {
  const result = validateContributorInput({
    name: "Carol",
    walletAddress: "0xabc",
  });
  assert.match(result ?? "", /Invalid EVM wallet address/);
});

// ── Computed Metrics Tests ────────────────────────────────────────────────

type PayoutRecord = { status: string; totalAmountUsdc: number | string };

function computeContributorMetrics(payouts: PayoutRecord[]) {
  const activeStatuses = new Set(["active", "partially_released"]);
  const payoutCount = payouts.length;
  const activePayoutCount = payouts.filter((p) => activeStatuses.has(p.status)).length;
  const totalSettledUsdc = payouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.totalAmountUsdc), 0);

  return { payoutCount, activePayoutCount, totalSettledUsdc };
}

test("computes zero metrics for contributor with no payouts", () => {
  const metrics = computeContributorMetrics([]);
  assert.deepEqual(metrics, { payoutCount: 0, activePayoutCount: 0, totalSettledUsdc: 0 });
});

test("counts only active and partially_released payouts as active", () => {
  const metrics = computeContributorMetrics([
    { status: "draft", totalAmountUsdc: 100 },
    { status: "active", totalAmountUsdc: 200 },
    { status: "partially_released", totalAmountUsdc: 300 },
    { status: "completed", totalAmountUsdc: 500 },
  ]);
  assert.equal(metrics.payoutCount, 4);
  assert.equal(metrics.activePayoutCount, 2);
});

test("sums total settled USDC from completed payouts only", () => {
  const metrics = computeContributorMetrics([
    { status: "active", totalAmountUsdc: "1500.00" },
    { status: "completed", totalAmountUsdc: "500.00" },
    { status: "completed", totalAmountUsdc: "750.00" },
  ]);
  assert.equal(metrics.totalSettledUsdc, 1250);
});

test("draft payouts do not count toward active or settled totals", () => {
  const metrics = computeContributorMetrics([
    { status: "draft", totalAmountUsdc: 1000 },
  ]);
  assert.equal(metrics.activePayoutCount, 0);
  assert.equal(metrics.totalSettledUsdc, 0);
});
