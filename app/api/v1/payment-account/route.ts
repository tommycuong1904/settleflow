import { NextResponse } from "next/server";

import { getSessionFromRequest, getVerifiedSessionUser } from "@/lib/auth/session-server";
import { getPaymentAccountReadinessForUser } from "@/lib/repositories/payment-accounts";

export const dynamic = "force-dynamic";

/**
 * Deliberately exposes only the current user's product-level readiness. Provider
 * identifiers, addresses, keys, and provisioning details stay server-side.
 */
export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const user = await getVerifiedSessionUser(session);
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  return NextResponse.json({ status: await getPaymentAccountReadinessForUser(user.id) });
}
