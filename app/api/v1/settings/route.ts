import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from "@/lib/repositories/workspace-settings";
import {
  resolveProductContextFromRequestWithSession,
  resolveWorkspaceIdFromRequestWithSession,
  getSessionFromRequest,
} from "@/lib/auth/session-server";

const NOTIFICATION_KEYS = ["notifyOnSubmit", "notifyOnApprove", "notifyOnRelease"] as const;

export async function GET(request: Request) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }
  try {
    const workspaceId = await resolveWorkspaceIdFromRequestWithSession(request);
    const settings = await getWorkspaceSettings(workspaceId);
    return NextResponse.json({ data: settings });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_CONTEXT_REQUIRED") {
      return apiError("AUTH_CONTEXT_REQUIRED", { status: 403 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load workspace settings.";
    return apiError("SETTINGS_LOAD_FAILED", { message, status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const productContext = await resolveProductContextFromRequestWithSession(request);
    const workspaceId = productContext.workspaceId;

    if (productContext.actor !== "owner") {
      return apiError("FORBIDDEN_SETTINGS_UPDATE", {
        message: "Only workspace owners can update settings.",
        status: 403,
      });
    }

    if (!body || typeof body !== "object") {
      return apiError("INVALID_REQUEST_BODY", {
        message: "Invalid request payload.",
        status: 400,
      });
    }

    const input: {
      webhookUrl?: string | null;
      notifyOnSubmit?: boolean;
      notifyOnApprove?: boolean;
      notifyOnRelease?: boolean;
    } = {};

    if ("webhookUrl" in body) {
      const { webhookUrl } = body as { webhookUrl?: unknown };
      if (webhookUrl !== null && typeof webhookUrl !== "string") {
        return apiError("INVALID_WEBHOOK_URL", {
          message: "webhookUrl must be a string or null.",
          status: 400,
        });
      }
      if (typeof webhookUrl === "string" && webhookUrl.trim() && !/^https?:\/\//.test(webhookUrl.trim())) {
        return apiError("INVALID_WEBHOOK_URL", {
          message: "Webhook URL must start with http:// or https://.",
          status: 400,
        });
      }
      input.webhookUrl = webhookUrl;
    }

    for (const key of NOTIFICATION_KEYS) {
      if (key in body) {
        const value = (body as Record<string, unknown>)[key];
        if (typeof value !== "boolean") {
          return apiError("INVALID_NOTIFICATION_FLAG", {
            message: `${key} must be a boolean.`,
            status: 400,
          });
        }
        input[key] = value;
      }
    }

    const settings = await updateWorkspaceSettings(workspaceId, input);
    return NextResponse.json({ data: settings });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError("INVALID_JSON_BODY", { message: "Invalid JSON body.", status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save workspace settings.";
    return apiError("SETTINGS_SAVE_FAILED", { message, status: 400 });
  }
}
