import { randomBytes } from "node:crypto";
import { getAddress, verifyMessage } from "viem";

export const WALLET_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const challenges = new Map<string, { nonce: string; domain: string; message: string; expiresAt: number }>();

function cleanup() {
  const now = Date.now();
  for (const [key, value] of challenges) if (value.expiresAt <= now) challenges.delete(key);
}

export function createWalletChallenge(address: string, domain: string) {
  cleanup();
  const normalized = getAddress(address);
  const nonce = randomBytes(32).toString("base64url");
  const issuedAt = new Date().toISOString();
  const message = `${domain} wants you to sign in to SettleFlow.\n\nWallet: ${normalized}\nNonce: ${nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${new Date(Date.now() + WALLET_CHALLENGE_TTL_MS).toISOString()}`;
  challenges.set(nonce, { nonce, domain, message, expiresAt: Date.now() + WALLET_CHALLENGE_TTL_MS });
  return { nonce, message, expiresAt: Date.now() + WALLET_CHALLENGE_TTL_MS };
}

export async function consumeWalletChallenge(address: string, domain: string, nonce: string, message: string, signature: string) {
  cleanup();
  const challenge = challenges.get(nonce);
  if (!challenge || challenge.domain !== domain || challenge.message !== message) return false;
  challenges.delete(nonce);
  const recovered = await verifyMessage({ address: getAddress(address), message, signature: signature as `0x${string}` }).catch(() => false);
  return recovered;
}
