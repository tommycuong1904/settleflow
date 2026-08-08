import { NextResponse } from "next/server";
import { refreshReleaseProof, type RefreshProofInput } from "@/lib/repositories/release-proof";

const statuses = new Set(["confirmed", "failed"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as (Partial<RefreshProofInput> & {
    refreshedByUserId?: string;
    triggeredByUserId?: string;
  }) | null;
  if (!body || typeof body.status !== "string" || !statuses.has(body.status)) {
    return NextResponse.json({ error: "status must be confirmed or failed.", code: "INVALID_PROOF_STATUS" }, { status: 400 });
  }

  const actorUserId = typeof body.triggeredByUserId === "string" && body.triggeredByUserId.trim().length > 0
    ? body.triggeredByUserId
    : body.refreshedByUserId;

  if (typeof actorUserId !== "string" || actorUserId.trim().length === 0) {
    return NextResponse.json({ error: "triggeredByUserId is required.", code: "INVALID_PROOF_REFRESH_PAYLOAD" }, { status: 400 });
  }

  try {
    const result = await refreshReleaseProof(id, actorUserId, body as RefreshProofInput);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = {
      RELEASE_NOT_FOUND: 404,
      MILESTONE_NOT_FOUND: 404,
      PROOF_NOT_FOUND: 404,
      FORBIDDEN_PROOF_REFRESH: 403,
      RELEASE_NOT_REFRESHABLE: 409,
      PROOF_NOT_PENDING: 409,
      TX_HASH_REQUIRED: 422,
      FAILURE_REASON_REQUIRED: 422,
    }[code] ?? 500;
    return NextResponse.json({ error: code, code }, { status });
  }
}
