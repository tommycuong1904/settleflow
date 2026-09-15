import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { verifyReleaseTransaction } from "@/lib/arc/verify-release-transaction";

const root = new URL("../../", import.meta.url);
const source = async (file: string) => readFile(new URL(file, root), "utf8");
const hash = `0x${"ab".repeat(32)}`;
const from = "0x1111111111111111111111111111111111111111";
const to = "0x2222222222222222222222222222222222222222";
const release = { amountUsdc: "1", destinationWalletAddress: to, sourceWalletAddress: null };
const rpc = (overrides: Record<string, unknown> = {}, receipt: Record<string, unknown> = { status: "success", logs: [] }) => ({
  getTransaction: async () => ({ chainId: 5042002, from, to, value: BigInt("1000000000000000000"), ...overrides }),
  getTransactionReceipt: async () => receipt,
});

test("browser claim does not accept or persist a source wallet", async () => {
  const [route, repo] = await Promise.all([source("app/api/v1/releases/[id]/claim/route.ts"), source("lib/repositories/release-proof.ts")]);
  assert.match(route, /claimReleaseExecution\(id, context\.workspaceId\)/);
  assert.doesNotMatch(route, /sourceWalletAddress/);
  assert.match(repo, /data: \{ status: "pending" \}/);
  assert.doesNotMatch(repo.slice(repo.indexOf("export async function claimReleaseExecution"), repo.indexOf("type ProofRefreshUpdate")), /sourceWalletAddress/);
});

test("caller sourceWalletAddress is not used by browser confirmation", async () => {
  const [route, ui] = await Promise.all([source("app/api/v1/releases/[id]/claim/route.ts"), source("components/payouts/payout-detail-release-shell.tsx")]);
  assert.doesNotMatch(route, /request\.json|sourceWalletAddress/);
  const refreshBody = ui.slice(ui.indexOf('proof/refresh'), ui.indexOf('proof/refresh') + 500);
  assert.doesNotMatch(refreshBody, /sourceWalletAddress|connectedAddress/);
});

test("verified tx.from is the only browser source authority", async () => {
  const verifier = await source("lib/arc/verify-release-transaction.ts");
  assert.match(verifier, /const sourceWalletAddress = tx\.from\.toLowerCase\(\)/);
  const result = await verifyReleaseTransaction({ release, txHash: hash, client: rpc() });
  assert.equal(result.sourceWalletAddress, from);
});

for (const [name, overrides, receipt] of [
  ["recipient", { to: from }, { status: "success", logs: [] }],
  ["amount", { value: BigInt("2") }, { status: "success", logs: [] }],
  ["chain", { chainId: 1 }, { status: "success", logs: [] }],
  ["receipt", {}, { status: "reverted", logs: [] }],
] as const) {
  test(`wrong ${name} rejects before any binding/finalization`, async () => {
    await assert.rejects(verifyReleaseTransaction({ release, txHash: hash, client: rpc(overrides, receipt) }), /TX_SNAPSHOT_MISMATCH/);
    assert.equal(release.sourceWalletAddress, null);
  });
}

test("account switching cannot override actual on-chain tx.from", async () => {
  const switched = "0x3333333333333333333333333333333333333333";
  const result = await verifyReleaseTransaction({ release, txHash: hash, client: rpc({ from: switched }) });
  assert.equal(result.sourceWalletAddress, switched);
});

test("same and conflicting txHash writes are null-only and cannot double-finalize", async () => {
  const repo = await source("lib/repositories/release-proof.ts");
  const bind = repo.slice(repo.indexOf("if (verifiedBrowserSourceWallet)"), repo.indexOf("const now = new Date()"));
  assert.match(bind, /status: "pending", sourceWalletAddress: null, txHash: null/);
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
