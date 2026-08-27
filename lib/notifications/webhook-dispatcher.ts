/**
 * Notification Webhook Dispatcher
 * Sends real-time formatted event webhooks to Discord, Slack, Telegram, or custom endpoints.
 */
import { getWorkspaceSettings } from "@/lib/repositories/workspace-settings";

export type WebhookEventType =
  | "milestone_submitted"
  | "milestone_approved"
  | "milestone_rejected"
  | "milestone_released"
  | "test_event";

export type WebhookPayload = {
  event: WebhookEventType;
  payoutTitle: string;
  milestoneTitle: string;
  amountUsdc?: string | number;
  recipientAddress?: string;
  artifactUrl?: string;
  summary?: string;
  comment?: string;
  txHash?: string;
  explorerUrl?: string;
  timestamp?: string;
};

export function buildDiscordEmbed(payload: WebhookPayload) {
  const ts = payload.timestamp || new Date().toISOString();

  switch (payload.event) {
    case "milestone_submitted":
      return {
        username: "SettleFlow Bot",
        avatar_url: "https://arcscan.app/favicon.ico",
        embeds: [
          {
            title: "📥 Milestone Deliverable Submitted",
            description: `**${payload.milestoneTitle}** has been submitted for review in payout agreement **"${payload.payoutTitle}"**.`,
            color: 0x22d3ee, // Cyan
            fields: [
              ...(payload.amountUsdc
                ? [{ name: "Value", value: `${payload.amountUsdc} USDC`, inline: true }]
                : []),
              ...(payload.artifactUrl
                ? [{ name: "Deliverable Artifact", value: `[View Deliverable](${payload.artifactUrl})`, inline: true }]
                : []),
              ...(payload.summary
                ? [{ name: "Summary", value: payload.summary, inline: false }]
                : []),
            ],
            footer: { text: "SettleFlow • Arc Milestone Escrow" },
            timestamp: ts,
          },
        ],
      };

    case "milestone_approved":
      return {
        username: "SettleFlow Bot",
        embeds: [
          {
            title: "✅ Milestone Approved",
            description: `**${payload.milestoneTitle}** in **"${payload.payoutTitle}"** was approved by the reviewer!`,
            color: 0x34d399, // Emerald
            fields: [
              ...(payload.amountUsdc
                ? [{ name: "Release Amount", value: `${payload.amountUsdc} USDC`, inline: true }]
                : []),
              { name: "Status", value: "Ready for Owner Arc Release", inline: true },
            ],
            footer: { text: "SettleFlow • Arc Milestone Escrow" },
            timestamp: ts,
          },
        ],
      };

    case "milestone_rejected":
      return {
        username: "SettleFlow Bot",
        embeds: [
          {
            title: "⚠️ Milestone Revision Requested",
            description: `**${payload.milestoneTitle}** in **"${payload.payoutTitle}"** was returned for revisions.`,
            color: 0xf59e0b, // Amber
            fields: [
              ...(payload.comment
                ? [{ name: "Reviewer Feedback", value: payload.comment, inline: false }]
                : []),
            ],
            footer: { text: "SettleFlow • Arc Milestone Escrow" },
            timestamp: ts,
          },
        ],
      };

    case "milestone_released":
      return {
        username: "SettleFlow Bot",
        embeds: [
          {
            title: "💸 USDC Released on Arc Testnet",
            description: `Payout lead released **${payload.amountUsdc} USDC** for **${payload.milestoneTitle}**!`,
            color: 0x06b6d4, // Cyan
            fields: [
              ...(payload.recipientAddress
                ? [{ name: "Recipient Wallet", value: `\`${payload.recipientAddress}\``, inline: true }]
                : []),
              ...(payload.txHash
                ? [{ name: "Tx Hash", value: `\`${payload.txHash.slice(0, 16)}...\``, inline: true }]
                : []),
              ...(payload.explorerUrl || payload.txHash
                ? [
                    {
                      name: "Settlement Proof",
                      value: `[View on Arcscan](${payload.explorerUrl || `https://testnet.arcscan.app/tx/${payload.txHash}`})`,
                      inline: false,
                    },
                  ]
                : []),
            ],
            footer: { text: "SettleFlow • Arc Milestone Escrow" },
            timestamp: ts,
          },
        ],
      };

    case "test_event":
    default:
      return {
        username: "SettleFlow Bot",
        embeds: [
          {
            title: "🔔 SettleFlow Webhook Test",
            description: "Your notification webhook is connected and working properly!",
            color: 0x22d3ee,
            fields: [
              { name: "Network", value: "Arc Testnet (Chain ID 5042002)", inline: true },
              { name: "Settlement Token", value: "USDC (Native)", inline: true },
            ],
            footer: { text: "SettleFlow • Workspace Notifications" },
            timestamp: ts,
          },
        ],
      };
  }
}

export async function dispatchWebhookNotification(
  payload: WebhookPayload,
  customWebhookUrl?: string,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch,
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl =
    customWebhookUrl ||
    process.env.SETTLEFLOW_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;

  if (!webhookUrl || !webhookUrl.startsWith("http")) {
    return { success: false, error: "No valid webhook URL configured." };
  }

  try {
    const isDiscord = webhookUrl.includes("discord.com");
    const body = isDiscord
      ? buildDiscordEmbed(payload)
      : {
          text: `[SettleFlow] ${payload.event}: ${payload.milestoneTitle} (${payload.payoutTitle})`,
          ...payload,
        };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `Webhook responded with status ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Webhook dispatch failed.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Maps a webhook event to the workspace notification toggle that gates it.
 * Returns null for events that are not user-configurable (e.g. test_event).
 */
export function eventNotificationToggle(
  event: WebhookEventType,
): "notifyOnSubmit" | "notifyOnApprove" | "notifyOnRelease" | null {
  switch (event) {
    case "milestone_submitted":
      return "notifyOnSubmit";
    case "milestone_approved":
    case "milestone_rejected":
      return "notifyOnApprove";
    case "milestone_released":
      return "notifyOnRelease";
    case "test_event":
    default:
      return null;
  }
}

/**
 * Workspace-aware webhook dispatch.
 *
 * Resolves the webhook URL and per-event notification toggles from the
 * workspace's persisted settings. When the workspace has no webhook URL
 * configured, it falls back to the environment-configured
 * `SETTLEFLOW_WEBHOOK_URL` so self-hosted/global deployments keep working.
 */
export async function dispatchWorkspaceWebhookNotification(
  workspaceId: string,
  payload: WebhookPayload,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch,
): Promise<{ success: boolean; error?: string }> {
  const settings = await getWorkspaceSettings(workspaceId);

  const toggle = eventNotificationToggle(payload.event);
  if (toggle && settings[toggle] === false) {
    return { success: false, error: "Event notifications are disabled for this workspace." };
  }

  if (!settings.webhookUrl || !settings.webhookUrl.startsWith("http")) {
    // No workspace-configured URL — fall back to the env-configured global URL.
    return dispatchWebhookNotification(payload, undefined, fetchImpl);
  }

  return dispatchWebhookNotification(payload, settings.webhookUrl, fetchImpl);
}
