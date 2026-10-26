import { NextResponse } from "next/server";

import { getSessionFromRequest, getVerifiedSessionUser } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * Persists a user's choice to defer the optional Web2 payment-account setup.
 * This is account-scoped, so a later Google sign-in on another device does
 * not force the same onboarding again. A completed Circle account remains the
 * source of truth and naturally suppresses onboarding as well.
 */
export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (session.authType !== "web2_google") {
    return NextResponse.json({ error: "PAYMENT_ACCOUNT_REQUIRES_GOOGLE_SESSION" }, { status: 403 });
  }

  const user = await getVerifiedSessionUser(session);
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  await db.user.update({
    where: { id: user.id },
    data: { paymentAccountOnboardingSkippedAt: new Date() },
  });

  return NextResponse.json({ skipped: true });
}
