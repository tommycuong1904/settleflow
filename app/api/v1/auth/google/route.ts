import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deriveSmartAccountAddress } from "@/lib/auth/smart-account";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session";
import { verifyGoogleIdToken } from "@/lib/auth/google-server";
import { db } from "@/lib/db/client";
import { provisionGoogleUser } from "@/lib/auth/google-provisioning";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };
    if (!body.idToken) {
      return NextResponse.json({ error: "Missing required Google ID token." }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
    const profile = await verifyGoogleIdToken(body.idToken, clientId);
    if (profile.emailVerified === false) {
      return NextResponse.json({ error: "Google email is not verified." }, { status: 403 });
    }

    // Google authentication establishes an account, never workspace authority.
    // Invitation acceptance is the only path that grants a workspace membership.
    const { user } = await db.$transaction((tx) => provisionGoogleUser(tx, {
      sub: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    }));

    const smartAccountAddress = deriveSmartAccountAddress(profile.sub || profile.email);

    // Issue a server-side HttpOnly session cookie so the proxy gate can enforce
    // that mutation routes require an authenticated session.
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email ?? profile.email,
      name: user.displayName || profile.name || profile.email.split("@")[0],
      address: user.walletAddress ?? smartAccountAddress,
      authType: "web2_google",
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      ...SESSION_COOKIE_OPTIONS,
      name: SESSION_COOKIE_NAME,
    });

    return NextResponse.json({
      success: true,
      user: {
        email: user.email ?? profile.email,
        name: user.displayName || profile.name || profile.email.split("@")[0],
        picture: profile.picture || null,
        smartAccountAddress,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process Google authentication." },
      { status: 500 },
    );
  }
}
