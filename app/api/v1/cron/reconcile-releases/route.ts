import { NextResponse } from "next/server";
import { reconcilePendingBrowserReleases } from "@/lib/repositories/release-reconciliation";

function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "CRON_UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json(await reconcilePendingBrowserReleases());
}
