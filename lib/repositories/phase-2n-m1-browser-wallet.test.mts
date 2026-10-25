import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { verifyReleaseTransaction } from "@/lib/arc/verify-release-transaction";
import { encodeAbiParameters, encodeEventTopics, erc20Abi } from "viem";

const root = new URL("../../", import.meta.url);
const source = async (file: string) => readFile(new URL(file, root), "utf8");
const hash = `0x${"ab".repeat(32)}`;
const from = "0x1111111111111111111111111111111111111111";
const to = "0x2222222222222222222222222222222222222222";
const usdc = "0x3600000000000000000000000000000000000000";
const release = { amountUsdc: "1", destinationWalletAddress: to, sourceWalletAddress: from, executionMode: "browser_wallet" as const };
const transferTopics = encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from, to } });
const receiptForAmount = (amount: bigint) => ({
  status: "success",
  logs: [{ address: usdc, topics: transferTopics, data: encodeAbiParameters([{ type: "uint256" }], [amount]) }],
});
const rpc = (overrides: Record<string, unknown> = {}, receipt: Record<string, unknown> = receiptForAmount(BigInt(1_000_000))) => ({
  getTransaction: async () => ({ chainId: 5042002, from, to: usdc, value: BigInt(0), ...overrides }),
  getTransactionReceipt: async () => receipt,
});

test("browser claim does not accept or persist a source wallet", async () => {
  const [route, repo] = await Promise.all([source("app/api/v1/releases/[id]/claim/route.ts"), source("lib/repositories/release-proof.ts")]);
  assert.match(route, /claimReleaseExecution\(id, context\.workspaceId\)/);
  assert.doesNotMatch(route, /sourceWalletAddress/);
  assert.match(repo, /data: \{ status: "pending" \}/);
  assert.doesNotMatch(repo.slice(repo.indexOf("export async function claimReleaseExecution"), repo.indexOf("export async function getBrowserReleaseReconciliationSnapshot")), /sourceWalletAddress/);
});

test("real browser-wallet releases are fail-closed until the server safety gate is enabled", async () => {
  const route = await source("app/api/v1/milestones/[id]/release/route.ts");
  assert.match(route, /export async function GET/);
  assert.match(route, /isServerRealExecutionAuthorized/);
  assert.match(route, /ARC_CONFIG\.executionMode === "real" && !isServerRealExecutionAuthorized\(\)/);
  assert.match(route, /REAL_EXECUTION_NOT_AUTHORIZED/);
  const gateIndex = route.indexOf("REAL_EXECUTION_NOT_AUTHORIZED");
  const queueIndex = route.indexOf("const result = await queueMilestoneRelease");
  assert.ok(gateIndex >= 0 && queueIndex >= 0 && gateIndex < queueIndex);
});

test("real payment readiness is checked before a browser wallet is opened", async () => {
  const ui = await source("components/payouts/payout-detail-release-shell.tsx");
  assert.match(ui, /async function assertPaymentEnvironmentReady/);
  const readinessIndex = ui.indexOf("await assertPaymentEnvironmentReady()");
  const walletIndex = ui.indexOf("await assertBrowserWalletMatchesAuthenticatedAccount(address)");
  assert.ok(readinessIndex >= 0 && walletIndex >= 0 && readinessIndex < walletIndex);
});

test("the payment modal hides payment infrastructure failures from normal owner UI", async () => {
  const ui = await source("components/payouts/payout-detail-release-shell.tsx");
  assert.match(ui, /function isRealExecutionAuthorizationError/);
  assert.match(ui, /Payment needs support/);
  assert.match(ui, /You do not need to retry it or provide payment details/);
  assert.doesNotMatch(ui, /Start a new payment/);
});

test("caller sourceWalletAddress is not used by browser confirmation", async () => {
  const [route, ui] = await Promise.all([source("app/api/v1/releases/[id]/claim/route.ts"), source("components/payouts/payout-detail-release-shell.tsx")]);
  assert.doesNotMatch(route, /request\.json|sourceWalletAddress/);
  const refreshBody = ui.slice(ui.indexOf('proof/refresh'), ui.indexOf('proof/refresh') + 500);
  assert.doesNotMatch(refreshBody, /sourceWalletAddress|connectedAddress/);
});

test("an uncertain browser submission keeps technical recovery out of the payout UI", async () => {
  const ui = await source("components/payouts/payout-detail-release-shell.tsx");
  assert.match(ui, /Payment processing/);
  assert.match(ui, /You do not need to sign, retry, or provide any payment details/);
  assert.doesNotMatch(ui, /Enter a transaction hash manually/);
  assert.doesNotMatch(ui, /Check for payment/);
  assert.doesNotMatch(ui, /OWNER_CONFIRMED_NO_TRANSACTION/);
  assert.doesNotMatch(ui, /handleRefreshProof\("failed"/);
});

test("an unknown browser wallet result opens a simple processing status", async () => {
  const ui = await source("components/payouts/payout-detail-release-shell.tsx");
  const branchStart = ui.indexOf("error instanceof BrowserWalletSubmissionUnknownError");
  const branchEnd = ui.indexOf("return;", branchStart);
  const branch = ui.slice(branchStart, branchEnd);

  assert.ok(branchStart >= 0 && branchEnd > branchStart);
  assert.match(branch, /setReleaseStatus\("submitting"\)/);
  assert.match(branch, /setReleaseModalMode\("pending"\)/);
  assert.doesNotMatch(branch, /browser-candidates/);
});

test("verified tx.from must match the browser source snapshot", async () => {
  const verifier = await source("lib/arc/verify-release-transaction.ts");
  assert.match(verifier, /const sourceWalletAddress = tx\.from\.toLowerCase\(\)/);
  const result = await verifyReleaseTransaction({ release, txHash: hash, client: rpc() });
  assert.equal(result.sourceWalletAddress, from);
});

for (const [name, overrides, receipt] of [
  ["recipient", { to: from }, receiptForAmount(BigInt(1_000_000))],
  ["amount", {}, receiptForAmount(BigInt(2_000_000))],
  ["chain", { chainId: 1 }, receiptForAmount(BigInt(1_000_000))],
  ["receipt", {}, { status: "reverted", logs: [] }],
] as const) {
  test(`wrong ${name} rejects before any binding/finalization`, async () => {
    await assert.rejects(verifyReleaseTransaction({ release, txHash: hash, client: rpc(overrides, receipt) }), /TX_SNAPSHOT_MISMATCH/);
    assert.equal(release.sourceWalletAddress, from);
  });
}

test("account switching is rejected when it differs from the browser source snapshot", async () => {
  const switched = "0x3333333333333333333333333333333333333333";
  await assert.rejects(verifyReleaseTransaction({ release, txHash: hash, client: rpc({ from: switched }) }), /TX_SNAPSHOT_MISMATCH/);
});

test("browser confirmation relies on the verified source snapshot and cannot double-finalize", async () => {
  const repo = await source("lib/repositories/release-proof.ts");
  const bind = repo.slice(repo.indexOf("if (verifiedBrowserSourceWallet)"), repo.indexOf("const now = new Date()"));
  assert.match(bind, /status: "pending", txHash: null/);
  assert.doesNotMatch(bind, /sourceWalletAddress: verifiedBrowserSourceWallet/);
  assert.match(bind, /if \(bound\.count !== 1\) throw/);
  assert.match(repo, /where: \{ id: proof\.id, status: "pending" \}/);
  assert.match(repo, /where: \{ id: release\.id, status: "pending" \}/);
});

test("browser confirmation concurrency has one guarded finalization", async () => {
  const repo = await source("lib/repositories/release-proof.ts");
  assert.ok(repo.includes('SELECT id FROM "Milestone"') && repo.includes('FOR UPDATE'));
  assert.ok(repo.includes('SELECT id FROM "Payout"') && repo.includes('FOR UPDATE'));
  assert.match(repo, /recalculatePayoutStatus\(tx, release\.payoutId, workspaceId, true\)/);
});

test("Circle call-sites use executor results and trusted failure option only", async () => {
  const route = await source("app/api/v1/milestones/[id]/release/route.ts");
  const retry = await source("app/api/v1/releases/[id]/retry/route.ts");
  assert.match(route, /sendResult\.sourceWalletAddress/);
  assert.match(route, /executionMode === "circle_wallet"/);
  assert.match(retry, /sendResult\.sourceWalletAddress/);
  assert.match(retry, /trustedCircleWalletExecution: true/);
  assert.doesNotMatch(route, /connectedAddress|request\.json\(\).*sourceWalletAddress/);
});

test("focused test covers token mismatch through existing verifier suite", async () => {
  const verifierTests = await source("lib/arc/verify-release-transaction.test.mts");
  assert.match(verifierTests, /ERC-20 Transfer verification/);
  assert.match(verifierTests, /tokenAddress: source/);
});
