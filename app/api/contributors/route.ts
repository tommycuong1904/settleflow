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
import { resolveWorkspaceIdFromRequest } from "@/lib/runtime/product-context-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (!isValidEnumQueryValue(status, contributorStatuses)) {
    return apiError("INVALID_CONTRIBUTOR_STATUS", {
      message: "Invalid contributor status.",
      status: 400,
    });
  }

  const contributors = await listContributors({
    workspaceId: resolveWorkspaceIdFromRequest(request),
    status: parseEnumQueryValue(status, contributorStatuses),
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({ data: contributors });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const workspaceId = resolveWorkspaceIdFromRequest(request);

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

    if (
      !walletAddress ||
      typeof walletAddress !== "string" ||
      !/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())
    ) {
      return apiError("INVALID_WALLET_ADDRESS", {
        message:
          "A valid EVM wallet address (0x followed by 40 hex characters) is required.",
        status: 400,
      });
    }

    const contributor = await createContributor({
      workspaceId,
      name: name.trim(),
      walletAddress: walletAddress.trim(),
      email: typeof email === "string" ? email.trim() : undefined,
      role: typeof role === "string" ? role.trim() : undefined,
      notes: typeof notes === "string" ? notes.trim() : undefined,
    });

    return NextResponse.json({ data: contributor }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create contributor.";
    return apiError("CONTRIBUTOR_CREATE_FAILED", {
      message,
      status: 400,
    });
  }
}
