import assert from "node:assert/strict";
import test from "node:test";

import { db } from "@/lib/db/client";

const firstAddress = "0x1111111111111111111111111111111111111111";
const secondAddress = "0x2222222222222222222222222222222222222222";

test("a user can own multiple wallet links but an EVM address cannot belong to two users", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const firstUser = await db.user.create({
    data: { displayName: "Wallet Link Owner", email: `wallet-link-owner-${suffix}@example.test` },
  });
  const secondUser = await db.user.create({
    data: { displayName: "Wallet Link Conflict", email: `wallet-link-conflict-${suffix}@example.test` },
  });

  try {
    await db.userWallet.create({
      data: {
        userId: firstUser.id,
        address: firstAddress,
        normalizedAddress: firstAddress.toLowerCase(),
        kind: "web3_eoa",
        authEnabled: true,
        transactionEnabled: true,
      },
    });
    const circleLink = await db.userWallet.create({
      data: {
        userId: firstUser.id,
        address: secondAddress,
        normalizedAddress: secondAddress.toLowerCase(),
        kind: "circle_sca",
        transactionEnabled: true,
      },
    });

    assert.equal(await db.userWallet.count({ where: { userId: firstUser.id } }), 2);
    await assert.rejects(
      db.userWallet.create({
        data: {
          userId: secondUser.id,
          address: firstAddress.toLowerCase(),
          normalizedAddress: firstAddress.toLowerCase(),
          kind: "web3_eoa",
          authEnabled: true,
          transactionEnabled: true,
        },
      }),
      /Unique constraint failed/,
    );

    await db.circleUserWallet.create({
      data: {
        userId: firstUser.id,
        walletId: `circle-${suffix}`,
        address: secondAddress,
        blockchain: "ARC-TESTNET",
        accountType: "SCA",
        walletLinkId: circleLink.id,
      },
    });
    await assert.rejects(
      db.userWallet.delete({ where: { id: circleLink.id } }),
      /Foreign key constraint violated/,
      "a Circle-linked wallet cannot be removed while the Circle record references it",
    );
  } finally {
    await db.circleUserWallet.deleteMany({ where: { userId: firstUser.id } });
    await db.userWallet.deleteMany({ where: { userId: { in: [firstUser.id, secondUser.id] } } });
    await db.user.deleteMany({ where: { id: { in: [firstUser.id, secondUser.id] } } });
  }
});
