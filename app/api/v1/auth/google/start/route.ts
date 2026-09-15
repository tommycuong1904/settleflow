import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

function getCanonicalOrigin(requestUrl: string): string {
  const url = new URL(requestUrl);
  const host = url.hostname === "0.0.0.0" ? "localhost" : url.hostname;
  return `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}`;
}

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });

  const origin = getCanonicalOrigin(request.url);
  const redirectUri = `${origin}/api/v1/auth/google/callback`;
  const state = randomBytes(32).toString("hex");
  const nonce = randomBytes(32).toString("hex");
  const authUrl = new OAuth2Client(clientId, clientSecret, redirectUri).generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    nonce,
    prompt: "select_account",
  });
  const url = new URL(request.url);
  const cookieStore = await cookies();
  cookieStore.set("sf_google_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", maxAge: 600, path: "/" });
  cookieStore.set("sf_google_oauth_nonce", nonce, { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", maxAge: 600, path: "/" });
  cookieStore.set("sf_google_oauth_next", safeNext(url.searchParams.get("next")), { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", maxAge: 600, path: "/" });
  return NextResponse.redirect(authUrl);
}