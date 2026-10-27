import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import {
  contributorStatuses,
  isValidEnumQueryValue,
  parseEnumQueryValue,
} from "@/lib/api/list-query";
import {
  createContributor,
  listContributors,
} from "@/lib/repositories/contributors";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { assertCanCreateContributor } from "@/lib/runtime/product-policy";

export async function GET(request: Request) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (!isValidEnumQueryValue(status, contributorStatuses)) {
    return apiError("INVALID_CONTRIBUTOR_STATUS", {
      message: "Invalid contributor status.",
      status: 400,
    });
  }

  const productContext = await resolveProductContextFromRequestWithSession(request);
  const contributors = await listContributors({
    workspaceId: productContext.workspaceId,
    linkedUserId: productContext.actor === "contributor" ? productContext.activeUserId : undefined,
    status: parseEnumQueryValue(status, contributorStatuses),
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({ data: contributors });
}

export async function POST(request: Request) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  let productContext;
  try {
    productContext = await resolveProductContextFromRequestWithSession(request);
  } catch (error) {
    if (error instanceof Error && (error.message === "AUTH_CONTEXT_REQUIRED" || error.message === "AUTH_ROLE_AMBIGUOUS")) {
      return apiError(error.message, { status: 403 });
    }
    return apiError("CONTRIBUTOR_CREATE_FAILED", { message: "We couldn't add this contributor. Please try again.", status: 500 });
  }

  try {
    const body = await request.json();

    const permissionViolation = assertCanCreateContributor({
      productContext,
      actorUserId: productContext.activeUserId,
    });
    if (permissionViolation) {
      return apiError(permissionViolation.code, {
        message: permissionViolation.message,
        status: permissionViolation.status,
      });
    }

    if (!body || typeof body !== "object") {
      return apiError("INVALID_REQUEST_BODY", {
        message: "Invalid request payload.",
        status: 400,
      });
    }

    const { name, walletAddress, email, role, notes } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return apiError("MISSING_NAME", {
        message: "Contributor name is required.",
        status: 400,
      });
    }

    if (walletAddress !== undefined && (typeof walletAddress !== "string" || (walletAddress.trim() && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())))) {
      return apiError("INVALID_WALLET_ADDRESS", {
        message:
          "For Wallet payment, enter a valid wallet address that starts with 0x.",
        status: 400,
      });
    }

    const contributor = await createContributor({
      workspaceId: productContext.workspaceId,
      name: name.trim(),
      walletAddress: typeof walletAddress === "string" ? walletAddress.trim() : undefined,
      email: typeof email === "string" ? email.trim() : undefined,
      role: typeof role === "string" ? role.trim() : undefined,
      notes: typeof notes === "string" ? notes.trim() : undefined,
      createdByUserId: productContext.activeUserId,
    });

    return NextResponse.json({ data: contributor }, { status: 201 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";
    const message = rawMessage === "Contributor name is required."
      ? "Enter the contributor's name."
      : rawMessage.startsWith("Invalid EVM wallet address")
      ? "For Wallet payment, enter a valid wallet address that starts with 0x."
      : rawMessage === "A contributor with this wallet address already exists in this workspace."
      ? "This wallet address is already linked to a contributor in this workspace."
      : "We couldn't add this contributor. Please try again.";
    return apiError("CONTRIBUTOR_CREATE_FAILED", {
      message,
      status: 400,
    });
  }
}
