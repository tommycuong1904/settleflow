import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import {
  getSessionFromRequest,
  resolveWorkspaceIdFromRequestWithSession,
  resolveProductContextFromRequestWithSession,
} from "@/lib/auth/session-server";
import { getPayoutDetail, projectPayoutDetail } from "@/lib/repositories/payouts";
import { assertCanViewPayout } from "@/lib/runtime/product-policy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  try {
    const { id } = await params;
    const productContext = await resolveProductContextFromRequestWithSession(request);
    const workspaceId = productContext.workspaceId;
    const scope = productContext.actor === "contributor"
        ? { linkedUserId: productContext.activeUserId }
        : undefined;
    const detail = await getPayoutDetail(id, workspaceId, scope);
    if (!detail) {
      return apiError("PAYOUT_NOT_FOUND", { message: "Payout not found.", status: 404 });
    }

    const viewViolation = assertCanViewPayout({
      productContext,
      linkedContributorUserId: detail.contributor?.linkedUserId ?? null,
    });

    if (viewViolation) {
      return apiError(viewViolation.code, {
        message: viewViolation.message,
        status: viewViolation.status,
      });
    }

    return NextResponse.json({ data: projectPayoutDetail(detail, productContext.actor) });
  } catch (error) {
    if (error instanceof Error && (error.message === "AUTH_CONTEXT_REQUIRED" || error.message === "AUTH_ROLE_AMBIGUOUS")) {
      return apiError(error.message, { status: 403 });
    }
    return apiError("PAYOUT_LOAD_FAILED", { message: "Failed to load payout.", status: 500 });
  }
}
