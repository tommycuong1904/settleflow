import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { PRODUCT_CONTEXT_COOKIE_NAMES } from "@/lib/runtime/product-context";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(PRODUCT_CONTEXT_COOKIE_NAMES.workspaceId);
  return NextResponse.json({ success: true });
}
