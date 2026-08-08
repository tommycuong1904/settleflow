import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
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
    return apiError("INVALID_RELEASE_RETRY_PAYLOAD", { message: "triggeredByUserId is required.", status: 400 });
  }

  try {
    const result = await retryFailedRelease(id, triggeredByUserId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return apiErrorFromCode(
      code,
      {
        RELEASE_NOT_FOUND: 404,
        RELEASE_NOT_FAILED: 409,
        STALE_RELEASE_RETRY: 409,
        PROOF_NOT_FOUND: 404,
        RETRY_REQUIRES_FAILED_PROOF: 409,
        DESTINATION_WALLET_MISSING: 422,
        USER_NOT_FOUND: 404,
        FORBIDDEN_RELEASE_RETRY: 403,
      },
      {},
      { status: 500 },
    );
  }
}
