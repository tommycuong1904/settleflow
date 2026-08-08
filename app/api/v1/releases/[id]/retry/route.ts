import { NextResponse } from "next/server";
import { retryFailedRelease } from "@/lib/repositories/release-retry";

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const triggeredByUserId = body?.triggeredByUserId;

  if (!isNonEmpty(triggeredByUserId)) {
    return NextResponse.json(
      { error: "triggeredByUserId is required." },
      { status: 400 },
    );
  }

  try {
    const result = await retryFailedRelease(id, triggeredByUserId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = {
      RELEASE_NOT_FOUND: 404,
      RELEASE_NOT_FAILED: 409,
      DESTINATION_WALLET_MISSING: 422,
      USER_NOT_FOUND: 404,
      FORBIDDEN_RELEASE_RETRY: 403,
    }[code] ?? 500;

    return NextResponse.json({ error: code }, { status });
  }
}
