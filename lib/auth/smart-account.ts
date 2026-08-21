import { keccak256, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Derives a deterministic Ethereum secp256k1 private key for a Web2 identifier (e.g. Google user ID or email).
 */
export function deriveDeterministicPrivateKey(userIdOrEmail: string): Hex {
  const normalized = userIdOrEmail.trim().toLowerCase();
  const seed = `settleflow:embedded-keypair:arc-v1:${normalized}`;
  return keccak256(toHex(seed));
}

/**
 * Derives the checksummed EVM address matching the deterministic private key.
 * This ensures that if the user exports their private key and imports it into MetaMask / Rabby,
 * they will see the EXACT same address.
 */
export function deriveSmartAccountAddress(userIdOrEmail: string): `0x${string}` {
  const privKey = deriveDeterministicPrivateKey(userIdOrEmail);
  const account = privateKeyToAccount(privKey);
  return account.address;
}
