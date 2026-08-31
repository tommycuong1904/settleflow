import test from "node:test";
import assert from "node:assert/strict";
import { parseUnits, type Hex } from "viem";

import {
  createReleaseExecutor,
  type CircleWalletExecutorDeps,
} from "@/lib/arc/release-executor";
import type { ArcSendRequest } from "@/lib/arc/types";

const NATIVE_USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const ERC20_USDC_ADDRESS = "0x1230000000000000000000000000000000000000";
const SERVER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const RECIPIENT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const TX_HASH = "0x1f9840a85d5af5bf1d1762f925bdaddd4201f984" as Hex;
// Hardhat default test account key (valid 32-byte hex).
const VALID_TEST_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function makeRequest(overrides: Partial<ArcSendRequest> = {}): ArcSendRequest {
  return {
    recipient: RECIPIENT,
    amount: "25.5",
    tokenAddress: NATIVE_USDC_ADDRESS,
    executionMode: "circle_wallet",
    payoutId: "p1",
    milestoneId: "m1",
    releaseId: "r1",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<CircleWalletExecutorDeps> = {}): CircleWalletExecutorDeps {
  return {
    sourceAddress: SERVER_ADDRESS,
    sendTransaction: async () => TX_HASH,
    waitForReceipt: async () => ({ status: "success" }),
    ...overrides,
  };
}

test("browser_wallet mode returns an explicit client-execution failure (no synthetic tx)", async () => {
  const executor = createReleaseExecutor("browser_wallet");
  const result = await executor(makeRequest({ executionMode: "browser_wallet" }));

  assert.equal(result.status, "failed");
  assert.equal(result.txHash, undefined);
  assert.match(result.errorMessage ?? "", /client release flow/);
});

test("circle_wallet mode without ARC_SERVER_PRIVATE_KEY fails with a config error", async () => {
  const original = process.env.ARC_SERVER_PRIVATE_KEY;
  delete process.env.ARC_SERVER_PRIVATE_KEY;
  try {
    const executor = createReleaseExecutor("circle_wallet");
    const result = await executor(makeRequest());

    assert.equal(result.status, "failed");
    assert.match(result.errorMessage ?? "", /ARC_SERVER_PRIVATE_KEY/);
  } finally {
    if (original === undefined) delete process.env.ARC_SERVER_PRIVATE_KEY;
    else process.env.ARC_SERVER_PRIVATE_KEY = original;
  }
});

test("circle_wallet mode with an invalid private key fails explicitly", async () => {
  const original = process.env.ARC_SERVER_PRIVATE_KEY;
  process.env.ARC_SERVER_PRIVATE_KEY = "not-a-valid-private-key";
  try {
    const executor = createReleaseExecutor("circle_wallet");
    const result = await executor(makeRequest());

    assert.equal(result.status, "failed");
    assert.match(result.errorMessage ?? "", /Invalid ARC_SERVER_PRIVATE_KEY/);
  } finally {
    if (original === undefined) delete process.env.ARC_SERVER_PRIVATE_KEY;
    else process.env.ARC_SERVER_PRIVATE_KEY = original;
  }
});


test("circle_wallet mode sends native USDC and returns a confirmed proof with the real source wallet", async () => {
  const original = process.env.ARC_SERVER_PRIVATE_KEY;
  process.env.ARC_SERVER_PRIVATE_KEY = VALID_TEST_KEY;
  const captured: Array<{ to: string; value: bigint; data?: Hex }> = [];
  try {
    const executor = createReleaseExecutor("circle_wallet", {
      circleWallet: makeDeps({
        sendTransaction: async (args) => {
          captured.push({ to: args.to, value: args.value, data: args.data });
          return TX_HASH;
        },
      }),
    });
    const result = await executor(makeRequest());

    assert.equal(result.status, "confirmed");
    assert.equal(result.txHash, TX_HASH);
    assert.match(result.explorerUrl ?? "", new RegExp(`/tx/${TX_HASH}`));
    assert.equal(result.network, "Arc Testnet");
    assert.ok(result.confirmedAt);
    assert.equal(result.sourceWalletAddress, SERVER_ADDRESS);

    // Native USDC on Arc is a plain value transfer (no contract call data).
    assert.equal(captured.length, 1);
    assert.equal(captured[0].to.toLowerCase(), RECIPIENT.toLowerCase());
    assert.equal(captured[0].value, parseUnits("25.5", 18));
    assert.equal(captured[0].data, undefined);
  } finally {
    if (original === undefined) delete process.env.ARC_SERVER_PRIVATE_KEY;
    else process.env.ARC_SERVER_PRIVATE_KEY = original;
  }
});

test("circle_wallet mode uses an ERC-20 transfer call for a configured token address", async () => {
  const original = process.env.ARC_SERVER_PRIVATE_KEY;
  process.env.ARC_SERVER_PRIVATE_KEY = VALID_TEST_KEY;
  const captured: Array<{ to: string; value: bigint; data?: Hex }> = [];
  try {
    const executor = createReleaseExecutor("circle_wallet", {
      circleWallet: makeDeps({
        sendTransaction: async (args) => {
          captured.push({ to: args.to, value: args.value, data: args.data });
          return TX_HASH;
        },
      }),
    });
    const result = await executor(
      makeRequest({ tokenAddress: ERC20_USDC_ADDRESS }),
    );

    assert.equal(result.status, "confirmed");
    assert.equal(captured.length, 1);
    assert.equal(captured[0].to.toLowerCase(), ERC20_USDC_ADDRESS.toLowerCase());
    assert.equal(captured[0].value, BigInt(0));
    assert.ok(captured[0].data, "ERC-20 transfer should include encoded calldata");
    assert.match((captured[0].data as string).slice(0, 10), /^0x[0-9a-f]{8}$/i);
  } finally {
    if (original === undefined) delete process.env.ARC_SERVER_PRIVATE_KEY;
    else process.env.ARC_SERVER_PRIVATE_KEY = original;
  }
});

test("circle_wallet mode reports a reverted on-chain receipt as failed", async () => {
  const original = process.env.ARC_SERVER_PRIVATE_KEY;
  process.env.ARC_SERVER_PRIVATE_KEY = VALID_TEST_KEY;
  try {
    const executor = createReleaseExecutor("circle_wallet", {
      circleWallet: makeDeps({
        waitForReceipt: async () => ({ status: "reverted" }),
      }),
    });
    const result = await executor(makeRequest());

    assert.equal(result.status, "failed");
    assert.match(result.errorMessage ?? "", /reverted on-chain/);
  } finally {
    if (original === undefined) delete process.env.ARC_SERVER_PRIVATE_KEY;
    else process.env.ARC_SERVER_PRIVATE_KEY = original;
  }
});

test("circle_wallet mode preserves an uncertain submission as pending reconciliation", async () => {
  const original = process.env.ARC_SERVER_PRIVATE_KEY;
  process.env.ARC_SERVER_PRIVATE_KEY = VALID_TEST_KEY;
  try {
    const executor = createReleaseExecutor("circle_wallet", {
      circleWallet: makeDeps({
        sendTransaction: async () => {
          throw new Error("boom: insufficient funds");
        },
      }),
    });
    const result = await executor(makeRequest());

    assert.equal(result.status, "pending");
    assert.match(result.errorMessage ?? "", /requires reconciliation/);
  } finally {
    if (original === undefined) delete process.env.ARC_SERVER_PRIVATE_KEY;
    else process.env.ARC_SERVER_PRIVATE_KEY = original;
  }
});
