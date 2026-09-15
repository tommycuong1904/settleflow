import test from "node:test";
import assert from "node:assert/strict";
import { buildDiscordEmbed, dispatchWebhookNotification, INVALID_WEBHOOK_DESTINATION, validateWebhookDestination } from "./webhook-dispatcher";

const publicLookup = (async (_host: string, _options: { all: boolean; verbatim: boolean }) => [{ address: "93.184.216.34", family: 4 as const }]) as unknown as typeof import("node:dns/promises").lookup;
const privateLookup = (async (_host: string, _options: { all: boolean; verbatim: boolean }) => [{ address: "192.168.1.10", family: 4 as const }]) as unknown as typeof import("node:dns/promises").lookup;

// ─── buildDiscordEmbed ───────────────────────────────────────────────────────

test("buildDiscordEmbed milestone_submitted returns correct title", () => {
  const embed = buildDiscordEmbed({ event: "milestone_submitted", payoutTitle: "P", milestoneTitle: "M" });
  assert.equal(embed.embeds[0].title, "📥 Milestone Deliverable Submitted");
  assert.equal(embed.embeds[0].color, 0x22d3ee);
});

test("buildDiscordEmbed milestone_approved returns correct title", () => {
  const embed = buildDiscordEmbed({ event: "milestone_approved", payoutTitle: "P", milestoneTitle: "M" });
  assert.equal(embed.embeds[0].title, "✅ Milestone Approved");
  assert.equal(embed.embeds[0].color, 0x34d399);
});

test("buildDiscordEmbed milestone_rejected returns correct title", () => {
  const embed = buildDiscordEmbed({ event: "milestone_rejected", payoutTitle: "P", milestoneTitle: "M" });
  assert.equal(embed.embeds[0].title, "⚠️ Milestone Revision Requested");
  assert.equal(embed.embeds[0].color, 0xf59e0b);
});

test("buildDiscordEmbed milestone_released returns correct title", () => {
  const embed = buildDiscordEmbed({ event: "milestone_released", payoutTitle: "P", milestoneTitle: "M" });
  assert.equal(embed.embeds[0].title, "💸 USDC Released on Arc Testnet");
  assert.equal(embed.embeds[0].color, 0x06b6d4);
});

test("buildDiscordEmbed test_event returns correct title", () => {
  const embed = buildDiscordEmbed({ event: "test_event", payoutTitle: "P", milestoneTitle: "M" });
  assert.equal(embed.embeds[0].title, "🔔 SettleFlow Webhook Test");
  assert.equal(embed.embeds[0].color, 0x22d3ee);
});

test("buildDiscordEmbed milestone_released includes recipientAddress, txHash, and proof fields", () => {
  const embed = buildDiscordEmbed({
    event: "milestone_released",
    payoutTitle: "Test Payout",
    milestoneTitle: "Test Milestone",
    recipientAddress: "0xabc",
    txHash: "0x1234567890abcdef1234567890abcdef12345678",
    explorerUrl: "https://explorer.example.com/tx/0x1234",
  });
  const fieldNames = embed.embeds[0].fields.map((f: { name: string }) => f.name);
  assert.ok(fieldNames.includes("Recipient Wallet"));
  assert.ok(fieldNames.includes("Tx Hash"));
  assert.ok(fieldNames.includes("Settlement Proof"));
});

// ─── dispatchWebhookNotification ─────────────────────────────────────────────

test("dispatchWebhookNotification returns error when no URL configured", async () => {
  const origUrl = process.env.SETTLEFLOW_WEBHOOK_URL;
  const origPub = process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;
  delete process.env.SETTLEFLOW_WEBHOOK_URL;
  delete process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;
  try {
    const result = await dispatchWebhookNotification({
      event: "test_event",
      payoutTitle: "P",
      milestoneTitle: "M",
    });
    assert.equal(result.success, false);
    assert.equal(result.error, "No valid webhook URL configured.");
  } finally {
    if (origUrl) process.env.SETTLEFLOW_WEBHOOK_URL = origUrl;
    if (origPub) process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL = origPub;
  }
});

test("dispatchWebhookNotification posts Discord embed when URL is Discord", async () => {
  const origUrl = process.env.SETTLEFLOW_WEBHOOK_URL;
  const origPub = process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;
  process.env.SETTLEFLOW_WEBHOOK_URL = "https://discord.com/api/webhooks/123";
  delete process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;

  const calls: Array<{ url: string; body: string }> = [];
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body ?? "") });
    return new Response("ok", { status: 200 });
  };

  try {
    const result = await dispatchWebhookNotification(
      { event: "milestone_submitted", payoutTitle: "P", milestoneTitle: "M", amountUsdc: "100" },
      undefined,
      fakeFetch,
      publicLookup,
    );
    assert.equal(result.success, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://discord.com/api/webhooks/123");
    const parsed = JSON.parse(calls[0].body);
    assert.equal(parsed.embeds[0].title, "📥 Milestone Deliverable Submitted");
    assert.equal(parsed.embeds[0].color, 0x22d3ee);
  } finally {
    if (origUrl) process.env.SETTLEFLOW_WEBHOOK_URL = origUrl;
    if (origPub) process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL = origPub;
  }
});
test("dispatchWebhookNotification posts plain text body when URL is generic", async () => {
  const origUrl = process.env.SETTLEFLOW_WEBHOOK_URL;
  const origPub = process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;
  delete process.env.SETTLEFLOW_WEBHOOK_URL;
  delete process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;

  const calls: Array<{ url: string; body: string }> = [];
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body ?? "") });
    return new Response("ok", { status: 200 });
  };

  try {
    const result = await dispatchWebhookNotification(
      { event: "milestone_approved", payoutTitle: "My Payout", milestoneTitle: "My Milestone" },
      "http://93.184.216.34/notify",
      fakeFetch,
      publicLookup,
    );
    assert.equal(result.success, true);
    assert.equal(calls.length, 1);
    const parsed = JSON.parse(calls[0].body);
    assert.equal(parsed.text, "[SettleFlow] milestone_approved: My Milestone (My Payout)");
    assert.equal(parsed.event, "milestone_approved");
  } finally {
    if (origUrl) process.env.SETTLEFLOW_WEBHOOK_URL = origUrl;
    if (origPub) process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL = origPub;
  }
});

test("dispatchWebhookNotification returns error on non-ok response", async () => {
  const origUrl = process.env.SETTLEFLOW_WEBHOOK_URL;
  const origPub = process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;
  delete process.env.SETTLEFLOW_WEBHOOK_URL;
  delete process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;

  const fakeFetch = async () => new Response("not found", { status: 404 });

  try {
    const result = await dispatchWebhookNotification(
      { event: "test_event", payoutTitle: "P", milestoneTitle: "M" },
      "http://93.184.216.34/notify",
      fakeFetch,
      publicLookup,
    );
    assert.equal(result.success, false);
    assert.equal(result.error, "Webhook dispatch failed.");
  } finally {
    if (origUrl) process.env.SETTLEFLOW_WEBHOOK_URL = origUrl;
    if (origPub) process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL = origPub;
  }
});

test("dispatchWebhookNotification returns error when fetch throws", async () => {
  const origUrl = process.env.SETTLEFLOW_WEBHOOK_URL;
  const origPub = process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;
  delete process.env.SETTLEFLOW_WEBHOOK_URL;
  delete process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL;

  const fakeFetch = async () => { throw new Error("Connection refused"); };

  try {
    const result = await dispatchWebhookNotification(
      { event: "test_event", payoutTitle: "P", milestoneTitle: "M" },
      "http://93.184.216.34/notify",
      fakeFetch,
      publicLookup,
    );
    assert.equal(result.success, false);
    assert.equal(result.error, "Webhook dispatch failed.");
  } finally {
    if (origUrl) process.env.SETTLEFLOW_WEBHOOK_URL = origUrl;
    if (origPub) process.env.NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL = origPub;
  }
});

test("SSRF policy rejects loopback, private, link-local, IPv6, and mapped addresses", async () => {
  for (const url of ["http://127.0.0.1/hook", "http://10.0.0.1/hook", "http://169.254.169.254/hook", "http://[::1]/hook", "http://[fc00::1]/hook", "http://[::ffff:127.0.0.1]/hook"]) {
    await assert.rejects(() => validateWebhookDestination(url), { message: INVALID_WEBHOOK_DESTINATION });
  }
});

test("SSRF policy rejects hostname resolving to private IP", async () => {
  await assert.rejects(() => validateWebhookDestination("https://public-looking.example/hook", privateLookup), { message: INVALID_WEBHOOK_DESTINATION });
});

test("dispatcher uses redirect error and does not disclose response body", async () => {
  let options: RequestInit | undefined;
  const fakeFetch = async (_url: string | URL | Request, init?: RequestInit) => { options = init; return new Response("secret", { status: 200 }); };
  const result = await dispatchWebhookNotification({ event: "test_event", payoutTitle: "P", milestoneTitle: "M" }, "https://public.example/hook", fakeFetch, publicLookup);
  assert.equal(result.success, true); assert.equal(options?.redirect, "error"); assert.equal((result as { body?: unknown }).body, undefined);
});
