import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { claimReleaseExecution } from "@/lib/repositories/release-proof";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { assertCanReleaseMilestone } from "@/lib/runtime/product-policy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }
  const context = await resolveProductContextFromRequestWithSession(request);
  const violation = assertCanReleaseMilestone({ productContext: context, actorUserId: context.activeUserId });
  if (violation) return NextResponse.json({ error: violation.message }, { status: violation.status });
  try {
    return NextResponse.json(await claimReleaseExecution(id, context.workspaceId));
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNABLE_TO_CLAIM_RELEASE";
    return NextResponse.json({ error: code }, { status: code === "RELEASE_NOT_FOUND" ? 404 : 409 });
  }
}
