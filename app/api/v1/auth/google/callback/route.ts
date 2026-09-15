import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { db } from "@/lib/db/client";
import { deriveSmartAccountAddress } from "@/lib/auth/smart-account";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { provisionGoogleUser } from "@/lib/auth/google-provisioning";

export const dynamic = "force-dynamic";

function getCanonicalOrigin(requestUrl: string): string {
  const url = new URL(requestUrl);
  const host = url.hostname === "0.0.0.0" ? "localhost" : url.hostname;
  return `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}`;
}

export async function GET(request: Request) {
  const origin = getCanonicalOrigin(request.url);
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const state = cookieStore.get("sf_google_oauth_state")?.value;
  const nonce = cookieStore.get("sf_google_oauth_nonce")?.value;
  const next = cookieStore.get("sf_google_oauth_next")?.value || "/dashboard";
  const clear = () => ["sf_google_oauth_state", "sf_google_oauth_nonce", "sf_google_oauth_next"];
  if (!state || !nonce || state !== url.searchParams.get("state")) return NextResponse.json({ error: "Invalid Google OAuth state." }, { status: 400 });
  if (url.searchParams.get("error")) {
    const response = NextResponse.redirect(new URL(`/auth-required?next=${encodeURIComponent(next)}&error=Google%20sign-in%20was%20cancelled.`, origin));
    for (const name of clear()) response.cookies.delete(name);
    return response;
  }
  const code = url.searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
  try {
    const redirectUri = `${origin}/api/v1/auth/google/callback`;
    const client = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) throw new Error("Google did not return an ID token.");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || (nonce && profile.nonce !== nonce) || profile.email_verified === false) throw new Error("Google identity verification failed.");
    const provisioned = await db.$transaction((tx) => provisionGoogleUser(tx, { sub: profile.sub!, email: profile.email!, name: profile.name, picture: profile.picture }));
    const user = provisioned.user;
    const sessionToken = await createSessionToken({ userId: user.id, email: user.email ?? profile.email, name: user.displayName || profile.name || profile.email.split("@")[0], address: user.walletAddress ?? deriveSmartAccountAddress(profile.sub), authType: "web2_google" });
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, { ...SESSION_COOKIE_OPTIONS, name: SESSION_COOKIE_NAME });
    for (const name of clear()) response.cookies.delete(name);
    return response;
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Google authentication failed";
    const safeMessage = rawMessage.includes("Invalid `db.user") || rawMessage.includes("Unknown argument `googleSub`")
      ? "Google account setup is temporarily unavailable. Please try again."
      : rawMessage;
    const failure = new URL(`/auth-required?next=${encodeURIComponent(next)}&error=${encodeURIComponent(safeMessage)}`, origin);
    const response = NextResponse.redirect(failure);
    for (const name of clear()) response.cookies.delete(name);
    return response;
  }
}