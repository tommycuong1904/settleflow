import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import {
  isValidEnumQueryValue,
  parseEnumQueryValue,
  payoutStatuses,
} from "@/lib/api/list-query";
import { listPayouts } from "@/lib/repositories/payouts";
import {
  getSessionFromRequest,
  resolveProductContextFromRequestWithSession,
} from "@/lib/auth/session-server";

export async function GET(request: Request) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (!isValidEnumQueryValue(status, payoutStatuses)) {
    return apiError("INVALID_PAYOUT_STATUS", { message: "Invalid payout status.", status: 400 });
  }

  let productContext;
  try {
    productContext = await resolveProductContextFromRequestWithSession(request);
  } catch (error) {
    if (error instanceof Error && (error.message === "AUTH_CONTEXT_REQUIRED" || error.message === "AUTH_ROLE_AMBIGUOUS")) {
      return apiError(error.message, { status: 403 });
    }
    return apiError("PAYOUT_LIST_LOAD_FAILED", { message: "Unable to load payouts.", status: 500 });
  }

  // Contributors can only see payouts where they are the linked user
  const linkedUserId =
    productContext.actor === "contributor" ? productContext.activeUserId : undefined;
  if (productContext.actor === "ops") {
    return apiError("FORBIDDEN_PAYOUT_LIST", { status: 403 });
  }
  const payouts = await listPayouts({
    workspaceId: productContext.workspaceId,
    contributorId: searchParams.get("contributorId") ?? undefined,
    linkedUserId,

    status: parseEnumQueryValue(status, payoutStatuses),
  });

  return NextResponse.json({ data: payouts });
}
