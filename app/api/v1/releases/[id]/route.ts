import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getReleaseById } from "@/lib/repositories/releases";
import { assertCanViewPayout } from "@/lib/runtime/product-policy";
import { getPayoutDetail } from "@/lib/repositories/payouts";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }
  const { id } = await params;
  try {
    const context = await resolveProductContextFromRequestWithSession(request);
    const release = await getReleaseById(
      id,
      context.workspaceId,
      context.actor === "contributor" ? context.activeUserId : undefined,
      context.actor,
    );
    if (!release) return NextResponse.json({ error: "Release not found." }, { status: 404 });

    const payoutDetail = await getPayoutDetail(
      release.payoutId,
      context.workspaceId,
      context.actor === "contributor" ? { linkedUserId: context.activeUserId } : undefined,
    );
    if (!payoutDetail) return NextResponse.json({ error: "Release not found." }, { status: 404 });

    const viewViolation = assertCanViewPayout({
      productContext: context,
      linkedContributorUserId: payoutDetail.contributor?.linkedUserId ?? null,
    });
    if (viewViolation) {
      return apiError(viewViolation.code, {
        message: viewViolation.message,
        status: viewViolation.status,
      });
    }

    return NextResponse.json({ data: release });
  } catch (error) {
    if (error instanceof Error && (error.message === "AUTH_CONTEXT_REQUIRED" || error.message === "AUTH_ROLE_AMBIGUOUS")) {
      return apiError(error.message, { status: 403 });
    }
    return apiError("RELEASE_LOAD_FAILED", { message: "Failed to load release.", status: 500 });
  }
}
