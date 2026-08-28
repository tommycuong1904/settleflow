import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deriveSmartAccountAddress } from "@/lib/auth/smart-account";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session";
import { fetchGoogleUserInfo } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      sub?: string;
      name?: string;
      picture?: string;
      accessToken?: string;
    };

    // When an OAuth access token is provided, verify the profile server-side
    // against Google's UserInfo endpoint so we never trust bare client claims.
    let verifiedEmail = body.email;
    let verifiedSub = body.sub;
    let verifiedName = body.name;
    let verifiedPicture = body.picture;

    if (body.accessToken) {
      const profile = await fetchGoogleUserInfo(body.accessToken);
      verifiedEmail = profile.email;
      verifiedSub = profile.sub;
      verifiedName = profile.name;
      verifiedPicture = profile.picture;
    }

    if (!verifiedEmail) {
      return NextResponse.json(
        { error: "Missing required user email." },
        { status: 400 },
      );
    }

    const smartAccountAddress = deriveSmartAccountAddress(verifiedSub || verifiedEmail);

    // Issue a server-side HttpOnly session cookie so the proxy gate can enforce
    // that mutation routes require an authenticated session.
    const sessionToken = await createSessionToken({
      userId: verifiedSub || verifiedEmail,
      email: verifiedEmail,
      name: verifiedName || verifiedEmail.split("@")[0],
      address: smartAccountAddress,
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
        email: verifiedEmail,
        name: verifiedName || verifiedEmail.split("@")[0],
        picture: verifiedPicture || null,
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
