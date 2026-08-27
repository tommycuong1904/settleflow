import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { updateContributor } from "@/lib/repositories/contributors";
import { resolveWorkspaceIdFromRequest } from "@/lib/runtime/product-context-server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const workspaceId = resolveWorkspaceIdFromRequest(request);

    if (!body || typeof body !== "object") {
      return apiError("INVALID_REQUEST_BODY", {
        message: "Invalid request payload.",
        status: 400,
      });
    }

    const input: {
      name?: string;
      walletAddress?: string;
      email?: string | null;
      role?: string | null;
      notes?: string | null;
      status?: "active" | "archived";
    } = {};

    if ("name" in body) {
      if (typeof body.name !== "string") {
        return apiError("INVALID_NAME", {
          message: "Contributor name must be a string.",
          status: 400,
        });
      }
      input.name = body.name;
    }

    if ("walletAddress" in body) {
      if (typeof body.walletAddress !== "string") {
        return apiError("INVALID_WALLET_ADDRESS", {
          message: "Wallet address must be a string.",
          status: 400,
        });
      }
      input.walletAddress = body.walletAddress;
    }

    if ("status" in body) {
      if (body.status !== "active" && body.status !== "archived") {
        return apiError("INVALID_CONTRIBUTOR_STATUS", {
          message: "Status must be 'active' or 'archived'.",
          status: 400,
        });
      }
      input.status = body.status;
    }

    if ("email" in body) {
      input.email = typeof body.email === "string" ? body.email : null;
    }
    if ("role" in body) {
      input.role = typeof body.role === "string" ? body.role : null;
    }
    if ("notes" in body) {
      input.notes = typeof body.notes === "string" ? body.notes : null;
    }

    const contributor = await updateContributor(id, input, workspaceId);
    return NextResponse.json({ data: contributor });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update contributor.";
    return apiError("CONTRIBUTOR_UPDATE_FAILED", { message, status: 400 });
  }
}
