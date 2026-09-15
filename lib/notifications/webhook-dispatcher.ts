/**
 * Notification Webhook Dispatcher
 * Sends real-time formatted event webhooks to Discord, Slack, Telegram, or custom endpoints.
 */
import { getWorkspaceSettings } from "@/lib/repositories/workspace-settings";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const INVALID_WEBHOOK_DESTINATION = "Webhook destination is not allowed.";
const WEBHOOK_FAILURE = "Webhook dispatch failed.";

function isBlockedAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  const mapped = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  const version = isIP(mapped);
  if (version === 4) {
    const octets = mapped.split(".").map(Number);
    const [a, b] = octets;
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      a >= 224;
  }
  if (version === 6) {
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fe80:") ||
      normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("ff") ||
      (normalized.startsWith("::ffff:") && isBlockedAddress(mapped));
  }
  return false;
}

export async function validateWebhookDestination(rawUrl: string, dnsLookup: typeof lookup = lookup): Promise<URL> {
  let url: URL;
  try { url = new URL(rawUrl.trim()); } catch { throw new Error(INVALID_WEBHOOK_DESTINATION); }
  if (url.protocol !== "http:" && url.protocol !== "https:" || url.username || url.password) {
    throw new Error(INVALID_WEBHOOK_DESTINATION);
  }
  const host = url.hostname.replace(/^\\[|\\]$/g, "");
  if (isBlockedAddress(host)) throw new Error(INVALID_WEBHOOK_DESTINATION);
  try {
    const addresses = await dnsLookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) {
      throw new Error(INVALID_WEBHOOK_DESTINATION);
    }
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_WEBHOOK_DESTINATION) throw error;
    throw new Error(INVALID_WEBHOOK_DESTINATION);
  }
  return url;
}

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
  dnsLookup: typeof lookup = lookup,
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl =
    customWebhookUrl ||
    process.env.SETTLEFLOW_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;

  if (!webhookUrl || !webhookUrl.startsWith("http")) {
    return { success: false, error: "No valid webhook URL configured." };
  }

  try {
    const destination = await validateWebhookDestination(webhookUrl, dnsLookup);
    const isDiscord = webhookUrl.includes("discord.com");
    const body = isDiscord
      ? buildDiscordEmbed(payload)
      : {
          text: `[SettleFlow] ${payload.event}: ${payload.milestoneTitle} (${payload.payoutTitle})`,
          ...payload,
        };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    let response: Response;
    try {
      response = await fetchImpl(destination, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        redirect: "error",
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return { success: false, error: WEBHOOK_FAILURE };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_WEBHOOK_DESTINATION) {
      return { success: false, error: INVALID_WEBHOOK_DESTINATION };
    }
    return { success: false, error: WEBHOOK_FAILURE };
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
