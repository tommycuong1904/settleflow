import { NextResponse } from "next/server";
import { dispatchWebhookNotification } from "@/lib/notifications/webhook-dispatcher";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const webhookUrl = body.webhookUrl;

    if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.startsWith("http")) {
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
