import { NextResponse } from "next/server";

import { CIRCLE_SMART_WALLET_AVAILABLE, circleSmartWalletComingSoonResponse } from "@/lib/circle/availability";
import { CircleApiError, CircleConfigurationError, createCircleSocialDeviceSession } from "@/lib/circle/user-controlled";
import { getSessionFromRequest, getVerifiedSessionUser } from "@/lib/auth/session-server";

export async function POST(request: Request) {
  if (!CIRCLE_SMART_WALLET_AVAILABLE) {
    return NextResponse.json(circleSmartWalletComingSoonResponse(), { status: 503 });
  }
  const session = await getSessionFromRequest(request);
  if (!session || session.authType !== "web2_google" || !(await getVerifiedSessionUser(session))) {
    return NextResponse.json({ error: "CIRCLE_WALLET_REQUIRES_GOOGLE_SESSION" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { deviceId?: unknown } | null;
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId.trim() : "";
  if (deviceId.length < 8 || deviceId.length > 256) {
    return NextResponse.json({ error: "CIRCLE_DEVICE_ID_REQUIRED" }, { status: 400 });
  }
  try {
    return NextResponse.json(await createCircleSocialDeviceSession(deviceId));
  } catch (error) {
    if (error instanceof CircleConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof CircleApiError) return NextResponse.json({ error: "CIRCLE_WALLET_PROVIDER_ERROR" }, { status: 502 });
    return NextResponse.json({ error: "CIRCLE_WALLET_ERROR" }, { status: 500 });
  }
}
