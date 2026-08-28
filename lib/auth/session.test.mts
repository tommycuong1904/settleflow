import test from "node:test";
import assert from "node:assert/strict";

import {
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./session";

const SECRET = "test-secret-value";

function base64UrlToBytes(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const samplePayload: SessionPayload = {
  userId: "google-123",
  email: "user@example.com",
  name: "Example User",
  address: null,
  authType: "web2_google",
};

test("round-trips a valid session token with the correct secret", async () => {
  const token = await createSessionToken(samplePayload, SECRET);
  const session = await verifySessionToken(token, SECRET);

  assert.ok(session, "expected a valid session");
  assert.equal(session.userId, "google-123");
  assert.equal(session.email, "user@example.com");
  assert.equal(session.name, "Example User");
  assert.equal(session.authType, "web2_google");
});

test("round-trips unicode names without mangling UTF-8 bytes", async () => {
  const payload: SessionPayload = {
    userId: "google-456",
    email: "nguyen@example.com",
    name: "Nguyễn Văn An",
    address: null,
    authType: "web2_email",
  };

  const token = await createSessionToken(payload, SECRET);
  const session = await verifySessionToken(token, SECRET);

  assert.ok(session);
  assert.equal(session.name, "Nguyễn Văn An");
});

test("returns null when verified with a different secret", async () => {
  const token = await createSessionToken(samplePayload, SECRET);
  const session = await verifySessionToken(token, "a-different-secret");
  assert.equal(session, null);
});

test("returns null when the payload has been tampered with", async () => {
  const token = await createSessionToken(samplePayload, SECRET);
  const [payload, signature] = token.split(".");

  const tamperedBytes = base64UrlToBytes(payload);
  // Flip a byte in the payload without changing its length
  tamperedBytes[0] ^= 0x01;
  const tampered = base64UrlEncodeBytes(tamperedBytes);

  const session = await verifySessionToken(`${tampered}.${signature}`, SECRET);
  assert.equal(session, null);
});

test("returns null for malformed tokens", async () => {
  assert.equal(await verifySessionToken("no-dot-here", SECRET), null);
  assert.equal(await verifySessionToken("", SECRET), null);
  assert.equal(await verifySessionToken("a.b.c", SECRET), null);
});

test("returns null for an expired token", async () => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const expiredPayload = JSON.stringify({
    ...samplePayload,
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 3600,
  });
  const dataBytes = new TextEncoder().encode(expiredPayload);
  const signature = await crypto.subtle.sign("HMAC", key, dataBytes);

  const expiredToken = `${base64UrlEncodeBytes(new Uint8Array(dataBytes))}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
  const session = await verifySessionToken(expiredToken, SECRET);
  assert.equal(session, null);
});

test("preserves wallet session fields", async () => {
  const payload: SessionPayload = {
    userId: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
    email: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7@wallet.settleflow.io",
    name: "MetaMask",
    address: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    authType: "web3_wallet",
  };

  const token = await createSessionToken(payload, SECRET);
  const session = await verifySessionToken(token, SECRET);

  assert.ok(session);
  assert.equal(session.authType, "web3_wallet");
  assert.equal(session.address, "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7");
  assert.equal(session.userId, "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7");
});
