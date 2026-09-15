import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { dispatchWebhookNotification, INVALID_WEBHOOK_DESTINATION } from "@/lib/notifications/webhook-dispatcher";

export async function POST(request: Request) {
  if (!(await getSessionFromRequest(request))) {
    return apiError("AUTH_REQUIRED", { message: "Sign in is required.", status: 401 });
  }

  try {
    const productContext = await resolveProductContextFromRequestWithSession(request);
    if (productContext.actor !== "owner") {
      return apiError("FORBIDDEN_WEBHOOK_TEST", {
        message: "Only workspace owners can test webhooks.",
        status: 403,
      });
    }

    const body = await request.json();
    const webhookUrl = body.webhookUrl;

    if (!webhookUrl || typeof webhookUrl !== "string" || !/^https?:\/\//.test(webhookUrl.trim())) {
      return NextResponse.json(
        { error: "A valid http/https Webhook URL is required." },
        { status: 400 },
      );
    }

    const result = await dispatchWebhookNotification(
      {
        event: "test_event",
        payoutTitle: "Marketing Bounty Q3",
        milestoneTitle: "Test Milestone Notification",
      },
      webhookUrl,
    );

    if (!result.success && result.error === INVALID_WEBHOOK_DESTINATION) {
      return NextResponse.json({ error: INVALID_WEBHOOK_DESTINATION }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Failed to send test webhook." }, { status: 422 });
    }

    return NextResponse.json({ success: true, message: "Test webhook dispatched successfully!" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process webhook test." },
      { status: 500 },
    );
  }
}
