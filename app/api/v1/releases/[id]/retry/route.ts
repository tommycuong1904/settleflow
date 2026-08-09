import { NextResponse } from "next/server";
import { apiError, apiErrorFromCode } from "@/lib/api/errors";
import { retryFailedRelease } from "@/lib/repositories/release-retry";
import { canActorPerform } from "@/lib/runtime/product-context";
import { resolveProductContext } from "@/lib/runtime/product-context-server";

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const productContext = resolveProductContext({ ownerUserId: body?.triggeredByUserId });
  const triggeredByUserId = body?.triggeredByUserId ?? productContext.ownerUserId;

  if (!isNonEmpty(triggeredByUserId)) {
    return apiError("INVALID_RELEASE_RETRY_PAYLOAD", { message: "triggeredByUserId is required.", status: 400 });
  }

  if (!canActorPerform(productContext.actor, ["owner"])) {
    return apiError("FORBIDDEN_RELEASE_RETRY_ACTOR", { message: "Only owners can retry failed releases in this flow.", status: 403 });
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
