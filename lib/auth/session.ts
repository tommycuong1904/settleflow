/**
 * Session Token Management
 *
 * Creates and verifies signed session tokens using Web Crypto API HMAC-SHA256.
 * Tokens are stored in an HttpOnly cookie (`sf_session`) and validated in the
 * middleware (proxy.ts) to gate mutation routes.
 *
 * The signing secret is read from the environment variable `SETTLEFLOW_AUTH_SECRET`.
 * A dev-only fallback is provided for local development — never use the fallback in
 * production.
 *
 * Available in both Edge Runtime (middleware) and Node.js runtime (route handlers).
 */

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
  address?: string | null;
  authType: "web2_google" | "web2_email" | "web3_wallet";
}

export const SESSION_COOKIE_NAME = "sf_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const SESSION_COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export function getSessionSecret(): string {
  const configured = process.env.SETTLEFLOW_AUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SETTLEFLOW_AUTH_SECRET is required in production.");
  }
  return "dev-session-secret-do-not-use-in-prod";
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(
  secret: string,
  usage: "sign" | "verify",
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

/**
 * Creates a signed session token.
 * Returns a base64url-encoded payload and HMAC-SHA256 signature: `{payload}.{signature}`.
 */
export async function createSessionToken(
  payload: SessionPayload,
  secret?: string,
): Promise<string> {
  const key = await importHmacKey(secret ?? getSessionSecret(), "sign");

  const data = JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  });

  const dataBytes = new TextEncoder().encode(data);
  const signature = await crypto.subtle.sign("HMAC", key, dataBytes);

  return `${base64UrlEncodeBytes(new Uint8Array(dataBytes))}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

/**
 * Verifies a signed session token.
 * Returns the decoded payload when valid and not expired, or `null` on any failure.
 */
export async function verifySessionToken(
  token: string,
  secret?: string,
): Promise<SessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const key = await importHmacKey(secret ?? getSessionSecret(), "verify");

    const dataBytes = base64UrlToBytes(parts[0]);
    const signatureBytes = base64UrlToBytes(parts[1]);

    const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, dataBytes);
    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(dataBytes);
    const parsed = JSON.parse(payloadJson) as SessionPayload & {
      iat: number;
      exp: number;
    };

    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      userId: parsed.userId,
      email: parsed.email,
      name: parsed.name ?? null,
      address: parsed.address ?? null,
      authType: parsed.authType,
    };
  } catch {
    return null;
  }
}
