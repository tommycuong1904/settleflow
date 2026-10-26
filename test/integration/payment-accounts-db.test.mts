import assert from "node:assert/strict";
import test from "node:test";

import { db } from "@/lib/db/client";
import { createSessionToken } from "@/lib/auth/session";
import { GET as getPaymentAccount } from "@/app/api/v1/payment-account/route";
import { POST as skipPaymentAccountOnboarding } from "@/app/api/v1/payment-account/onboarding/skip/route";
import { NextRequest } from "next/server";
import { getPaymentAccountForUser, getPaymentAccountReadinessForUser } from "@/lib/repositories/payment-accounts";

test("payment accounts expose only a user's provider-neutral, verified wallet link", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({ data: { displayName: "Payment Account", email: `payment-account-${suffix}@example.com` } });

  try {
    const wallet = await db.userWallet.create({
      data: {
        userId: user.id,
        address: "0x0000000000000000000000000000000000000001",
        normalizedAddress: "0x0000000000000000000000000000000000000001",
        kind: "web3_eoa",
        transactionEnabled: true,
      },
    });
    await db.paymentAccount.create({
      data: {
        userId: user.id,
        provider: "future-embedded-provider",
        providerAccountId: `account-${suffix}`,
        walletLinkId: wallet.id,
        status: "ready",
      },
    });

    assert.deepEqual(await getPaymentAccountForUser(user.id, "future-embedded-provider"), {
      id: (await db.paymentAccount.findUniqueOrThrow({ where: { userId_provider: { userId: user.id, provider: "future-embedded-provider" } } })).id,
      provider: "future-embedded-provider",
      providerAccountId: `account-${suffix}`,
      status: "ready",
      walletLink: { id: wallet.id, address: wallet.address, transactionEnabled: true },
    });
    assert.equal(await getPaymentAccountForUser(user.id, "other-provider"), null);
    assert.equal(await getPaymentAccountReadinessForUser(user.id), "ready");

    const token = await createSessionToken({
      userId: user.id,
      email: user.email!,
      name: user.displayName,
      address: null,
      authType: "web2_google",
    });
    const response = await getPaymentAccount(new NextRequest("https://settleflow.local/api/v1/payment-account", {
      headers: { cookie: `sf_session=${token}` },
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ready" });

    const anonymous = await getPaymentAccount(new NextRequest("https://settleflow.local/api/v1/payment-account"));
    assert.equal(anonymous.status, 401);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});

test("Google users can defer payment-account onboarding once across future sign-ins", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({ data: { displayName: "Deferred setup", email: `deferred-setup-${suffix}@example.com` } });

  try {
    const token = await createSessionToken({
      userId: user.id,
      email: user.email!,
      name: user.displayName,
      address: null,
      authType: "web2_google",
    });
    const response = await skipPaymentAccountOnboarding(new NextRequest("https://settleflow.local/api/v1/payment-account/onboarding/skip", {
      method: "POST",
      headers: { cookie: `sf_session=${token}` },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { skipped: true });
    assert.ok((await db.user.findUniqueOrThrow({ where: { id: user.id } })).paymentAccountOnboardingSkippedAt);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});

test("payment-account readiness and onboarding changes remain scoped to the signed-in user", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const userA = await db.user.create({ data: { displayName: "Payment user A", email: `payment-a-${suffix}@example.com` } });
  const userB = await db.user.create({ data: { displayName: "Payment user B", email: `payment-b-${suffix}@example.com` } });

  try {
    const walletB = await db.userWallet.create({
      data: {
        userId: userB.id,
        address: "0x0000000000000000000000000000000000000002",
        normalizedAddress: "0x0000000000000000000000000000000000000002",
        kind: "circle_sca",
        transactionEnabled: true,
      },
    });
    await db.paymentAccount.create({
      data: { userId: userB.id, provider: "circle_user_controlled", providerAccountId: `circle-${suffix}`, walletLinkId: walletB.id, status: "ready" },
    });
    const tokenA = await createSessionToken({ userId: userA.id, email: userA.email!, name: userA.displayName, address: null, authType: "web2_google" });
    const tokenB = await createSessionToken({ userId: userB.id, email: userB.email!, name: userB.displayName, address: null, authType: "web2_google" });

    const accountA = await getPaymentAccount(new NextRequest("https://settleflow.local/api/v1/payment-account", { headers: { cookie: `sf_session=${tokenA}` } }));
    assert.deepEqual(await accountA.json(), { status: "setup_required" });
    const accountB = await getPaymentAccount(new NextRequest("https://settleflow.local/api/v1/payment-account", { headers: { cookie: `sf_session=${tokenB}` } }));
    assert.deepEqual(await accountB.json(), { status: "ready" });

    const skipped = await skipPaymentAccountOnboarding(new NextRequest("https://settleflow.local/api/v1/payment-account/onboarding/skip", {
      method: "POST", headers: { cookie: `sf_session=${tokenA}` },
    }));
    assert.equal(skipped.status, 200);
    assert.ok((await db.user.findUniqueOrThrow({ where: { id: userA.id } })).paymentAccountOnboardingSkippedAt);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: userB.id } })).paymentAccountOnboardingSkippedAt, null);
  } finally {
    await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  }
});
