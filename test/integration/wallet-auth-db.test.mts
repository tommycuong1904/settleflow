import assert from "node:assert/strict";
import test from "node:test";

import { privateKeyToAccount } from "viem/accounts";
import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { consumeWalletChallenge } from "@/lib/auth/wallet-challenge";
import { provisionGoogleUser } from "@/lib/auth/google-provisioning";
import { provisionWalletUser } from "@/lib/auth/wallet-provisioning";
import { POST as createNonce } from "@/app/api/v1/auth/wallet/nonce/route";

const account = privateKeyToAccount("0x0123456789012345678901234567890123456789012345678901234567890123");
const origin = "https://settleflow.local";

function request(path: string, body: unknown) {
  return new NextRequest(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

async function issueSignedChallenge() {
  const response = await createNonce(request("/api/v1/auth/wallet/nonce", { address: account.address }));
  assert.equal(response.status, 200);
  const challenge = await response.json() as { nonce: string; message: string };
  const signature = await account.signMessage({ message: challenge.message });
  return { ...challenge, signature };
}

test("Google and wallet identity provisioning never grants membership", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const workspace = await db.workspace.create({
    data: { name: "Wallet Auth Test", slug: `wallet-auth-${suffix}` },
  });
  let userId: string | null = null;
  let googleUserId: string | null = null;

  try {
    const google = await provisionGoogleUser(db, {
      sub: `google-provisioning-${suffix}`,
      email: `google-provisioning-${suffix}@example.test`,
    });
    googleUserId = google.user.id;
    assert.equal(await db.workspaceMember.count({ where: { userId: googleUserId } }), 0);

    const provisioned = await provisionWalletUser(db, account.address, "Test Wallet");
    userId = provisioned.id;
    assert.equal(provisioned.walletAddress, account.address);
    assert.equal(await db.workspaceMember.count({ where: { userId } }), 0);

    const reused = await provisionWalletUser(db, account.address.toLowerCase(), "Another Name");
    assert.equal(reused.id, userId);
    assert.equal(await db.user.count({ where: { walletAddress: { equals: account.address, mode: "insensitive" } } }), 1);
    await assert.rejects(
      db.user.create({ data: { displayName: "Duplicate Wallet", walletAddress: account.address.toLowerCase() } }),
      /Unique constraint failed/,
    );

    await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId, role: "owner" } });

    const valid = await issueSignedChallenge();
    assert.equal(
      await consumeWalletChallenge(account.address, "settleflow.local", valid.nonce, valid.message, valid.signature),
      true,
    );
    assert.equal(
      await consumeWalletChallenge(account.address, "settleflow.local", valid.nonce, valid.message, valid.signature),
      false,
    );

    const concurrent = await issueSignedChallenge();
    const results = await Promise.all([
      consumeWalletChallenge(account.address, "settleflow.local", concurrent.nonce, concurrent.message, concurrent.signature),
      consumeWalletChallenge(account.address, "settleflow.local", concurrent.nonce, concurrent.message, concurrent.signature),
    ]);
    assert.deepEqual(results.sort(), [false, true]);

    const expiredNonce = `expired-${suffix}`;
    const expiredMessage = "Expired wallet challenge";
    await db.walletAuthChallenge.create({
      data: {
        nonce: expiredNonce,
        address: account.address,
        domain: "settleflow.local",
        message: expiredMessage,
        expiresAt: new Date(Date.now() - 1_000),
      },
    });
    const expiredSignature = await account.signMessage({ message: expiredMessage });
    assert.equal(
      await consumeWalletChallenge(account.address, "settleflow.local", expiredNonce, expiredMessage, expiredSignature),
      false,
    );
    assert.equal(await db.walletAuthChallenge.findUnique({ where: { nonce: expiredNonce } }), null);
  } finally {
    await db.walletAuthChallenge.deleteMany({ where: { address: account.address } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    if (userId) await db.user.delete({ where: { id: userId } });
    if (googleUserId) await db.user.delete({ where: { id: googleUserId } });
  }
});
