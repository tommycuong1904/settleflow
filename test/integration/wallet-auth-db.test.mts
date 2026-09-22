import assert from "node:assert/strict";
import test from "node:test";

import { privateKeyToAccount } from "viem/accounts";
import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { consumeWalletChallenge } from "@/lib/auth/wallet-challenge";
import { createSessionToken } from "@/lib/auth/session";
import { provisionGoogleUser } from "@/lib/auth/google-provisioning";
import { provisionWalletUser } from "@/lib/auth/wallet-provisioning";
import { resolveSessionContext } from "@/lib/auth/session-server";
import { POST as createNonce } from "@/app/api/v1/auth/wallet/nonce/route";
import { GET as listWallets, POST as linkWallet } from "@/app/api/v1/auth/wallet/link/route";

const account = privateKeyToAccount("0x0123456789012345678901234567890123456789012345678901234567890123");
const linkedAccount = privateKeyToAccount("0x1123456789012345678901234567890123456789012345678901234567890123");
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

async function issueSignedChallengeFor(address: typeof account.address, signer: typeof account) {
  const response = await createNonce(request("/api/v1/auth/wallet/nonce", { address }));
  assert.equal(response.status, 200);
  const challenge = await response.json() as { nonce: string; message: string };
  return { ...challenge, signature: await signer.signMessage({ message: challenge.message }) };
}

test("Google and Web3 identity provisioning creates independent accounts", async () => {
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
    assert.equal(google.user.walletAddress, null);
    assert.equal(await db.userWallet.count({ where: { userId: googleUserId } }), 0);
    await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: googleUserId, role: "reviewer" } });

    const provisioned = await provisionWalletUser(db, account.address, "Test Wallet");
    userId = provisioned.id;
    assert.notEqual(userId, googleUserId);
    assert.equal(provisioned.walletAddress, null);
    assert.equal(await db.workspaceMember.count({ where: { userId } }), 0);
    assert.equal(
      (await db.userWallet.findUniqueOrThrow({ where: { normalizedAddress: account.address.toLowerCase() } })).userId,
      userId,
    );

    const web3Session = await resolveSessionContext({
      userId,
      email: `${account.address.toLowerCase()}@wallet.settleflow.io`,
      address: account.address.toLowerCase(),
      authType: "web3_wallet",
    });
    assert.equal(web3Session, null);

    const reused = await provisionWalletUser(db, account.address.toLowerCase(), "Another Name");
    assert.equal(reused.id, userId);
    assert.equal(await db.userWallet.count({ where: { normalizedAddress: account.address.toLowerCase() } }), 1);

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

test("a signed-in account can link an EOA, and the linked EOA resolves to the same user", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const google = await provisionGoogleUser(db, {
    sub: `wallet-link-google-${suffix}`,
    email: `wallet-link-google-${suffix}@example.test`,
  });
  let otherUserId: string | null = null;
  const workspace = await db.workspace.create({ data: { name: "Wallet Link Workspace", slug: `wallet-link-${suffix}` } });
  await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: google.user.id, role: "owner" } });

  try {
    const session = await createSessionToken({
      userId: google.user.id,
      email: google.user.email!,
      name: google.user.displayName,
      address: null,
      authType: "web2_google",
    });
    const challenge = await issueSignedChallengeFor(linkedAccount.address, linkedAccount);
    const response = await linkWallet(new NextRequest(`${origin}/api/v1/auth/wallet/link`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, cookie: `sf_session=${session}` },
      body: JSON.stringify({ address: linkedAccount.address, ...challenge }),
    }));
    assert.equal(response.status, 201);
    const payload = await response.json() as { wallet: { id: string; address: string; kind: string } };
    assert.equal(payload.wallet.address, linkedAccount.address);
    assert.equal(payload.wallet.kind, "web3_eoa");

    const walletListResponse = await listWallets(new NextRequest(`${origin}/api/v1/auth/wallet/link`, {
      headers: { cookie: `sf_session=${session}` },
    }));
    assert.equal(walletListResponse.status, 200);
    const walletList = await walletListResponse.json() as { wallets: Array<{ address: string; kind: string }> };
    assert.deepEqual(
      walletList.wallets.map((wallet) => wallet.address).sort(),
      [linkedAccount.address],
    );

    const web3Context = await resolveSessionContext({
      userId: google.user.id,
      email: `${linkedAccount.address.toLowerCase()}@wallet.settleflow.io`,
      name: "Linked Wallet",
      address: linkedAccount.address.toLowerCase(),
      walletId: payload.wallet.id,
      authType: "web3_wallet",
    });
    assert.equal(web3Context?.user.id, google.user.id);
    assert.equal(web3Context?.productContext.workspaceId, workspace.id);

    const secondChallenge = await issueSignedChallengeFor(linkedAccount.address, linkedAccount);
    const duplicateResponse = await linkWallet(new NextRequest(`${origin}/api/v1/auth/wallet/link`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, cookie: `sf_session=${session}` },
      body: JSON.stringify({ address: linkedAccount.address, ...secondChallenge }),
    }));
    assert.equal(duplicateResponse.status, 409);

    const otherGoogle = await provisionGoogleUser(db, {
      sub: `wallet-link-other-${suffix}`,
      email: `wallet-link-other-${suffix}@example.test`,
    });
    otherUserId = otherGoogle.user.id;
    const otherSession = await createSessionToken({
      userId: otherGoogle.user.id,
      email: otherGoogle.user.email!,
      name: otherGoogle.user.displayName,
      address: null,
      authType: "web2_google",
    });
    const conflictChallenge = await issueSignedChallengeFor(linkedAccount.address, linkedAccount);
    const conflictResponse = await linkWallet(new NextRequest(`${origin}/api/v1/auth/wallet/link`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, cookie: `sf_session=${otherSession}` },
      body: JSON.stringify({ address: linkedAccount.address, ...conflictChallenge }),
    }));
    assert.equal(conflictResponse.status, 409);
  } finally {
    await db.walletAuthChallenge.deleteMany({ where: { address: linkedAccount.address } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    if (otherUserId) await db.user.delete({ where: { id: otherUserId } });
    await db.user.delete({ where: { id: google.user.id } });
  }
});

test("retired legacy export EOAs cannot establish a Web3 session", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({ data: { displayName: "Legacy EOA User", email: `legacy-eoa-${suffix}@example.test` } });
  const legacyAddress = `0x${suffix.replace(/[^a-f0-9]/gi, "a").padEnd(40, "b").slice(0, 40)}`;

  try {
    await db.userWallet.create({
      data: {
        userId: user.id,
        address: legacyAddress,
        normalizedAddress: legacyAddress.toLowerCase(),
        kind: "legacy_export_eoa",
        authEnabled: false,
        transactionEnabled: false,
      },
    });
    await assert.rejects(
      provisionWalletUser(db, legacyAddress, "Retired Legacy Wallet"),
      /WALLET_LOGIN_NOT_ENABLED/,
    );
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});
