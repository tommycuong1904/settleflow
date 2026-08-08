import { NextResponse } from "next/server";
import { refreshReleaseProof, type RefreshProofInput } from "@/lib/repositories/release-proof";

const statuses = new Set(["confirmed", "failed"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as Partial<RefreshProofInput> | null;
  if (!body || typeof body.status !== "string" || !statuses.has(body.status)) {
    return NextResponse.json({ error: "status must be confirmed or failed." }, { status: 400 });
  }

  try {
    const result = await refreshReleaseProof(id, body as RefreshProofInput);
    return NextResponse.json({ data: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = {
      RELEASE_NOT_FOUND: 404,
      MILESTONE_NOT_FOUND: 404,
      PROOF_NOT_FOUND: 404,
      RELEASE_NOT_REFRESHABLE: 409,
      PROOF_NOT_PENDING: 409,
      TX_HASH_REQUIRED: 422,
      FAILURE_REASON_REQUIRED: 422,
    }[code] ?? 500;
    return NextResponse.json({ error: code }, { status });
  }
}
