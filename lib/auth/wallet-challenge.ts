import { randomBytes } from "node:crypto";
import { getAddress, verifyMessage } from "viem";
import { db } from "@/lib/db/client";

export const WALLET_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function createWalletChallenge(address: string, domain: string) {
  const now = new Date();
  const normalizedAddress = getAddress(address);
  const nonce = randomBytes(32).toString("base64url");
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + WALLET_CHALLENGE_TTL_MS);
  const message = `${domain} wants you to sign in to SettleFlow.\n\nWallet: ${normalizedAddress}\nNonce: ${nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expiresAt.toISOString()}`;

  // Best-effort expiry cleanup keeps the durable challenge table bounded.
  await db.walletAuthChallenge.deleteMany({ where: { expiresAt: { lte: now } } });
  await db.walletAuthChallenge.create({
    data: { nonce, address: normalizedAddress, domain, message, expiresAt },
  });

  return { nonce, message, expiresAt: expiresAt.getTime() };
}

export async function consumeWalletChallenge(
  address: string,
  domain: string,
  nonce: string,
  message: string,
  signature: string,
) {
  const normalizedAddress = getAddress(address);
  const challenge = await db.walletAuthChallenge.findUnique({ where: { nonce } });
  if (!challenge) return false;

  const now = new Date();
  if (
    challenge.expiresAt <= now ||
    challenge.address !== normalizedAddress ||
    challenge.domain !== domain ||
    challenge.message !== message
  ) {
    if (challenge.expiresAt <= now) {
      await db.walletAuthChallenge.deleteMany({ where: { nonce, expiresAt: { lte: now } } });
    }
    return false;
  }

  const signatureValid = await verifyMessage({
    address: normalizedAddress,
    message,
    signature: signature as `0x${string}`,
  }).catch(() => false);
  if (!signatureValid) return false;

  // Only one concurrent request can consume this nonce. The expiry predicate
  // also prevents a signature verified just before expiry from being accepted.
  const consumed = await db.walletAuthChallenge.deleteMany({
    where: { nonce, address: normalizedAddress, domain, message, expiresAt: { gt: new Date() } },
  });
  return consumed.count === 1;
}
