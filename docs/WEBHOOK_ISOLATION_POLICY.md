# Webhook Isolation Policy

This document defines webhook isolation and delivery policy only. It contains no secret values and does not alter runtime behavior. Runtime dispatch behavior remains defined by `lib/notifications/webhook-dispatcher.ts` and the API routes that call it.

## Delivery configuration

Workspace webhook settings are persisted and event toggles gate dispatch. The server-only global fallback is `SETTLEFLOW_WEBHOOK_URL`. `NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL` is client-exposed by design and MUST NOT be treated as a private secret or secure destination.

Dispatch currently has a five-second timeout, is non-blocking to settlement, and has no durable retry/replay queue. Operators verify destination before deployment and record failures for manual, controlled replay.

## Environment isolation

Staging and production MUST use separate destinations and environment scopes. Prefer an explicit staging destination or disabled delivery during non-transaction verification. An allowlist concept should restrict approved destinations before production use. A staging webhook destination MUST NOT be a production destination, and a production webhook destination MUST NOT be a staging destination.

## Core invariants

Webhook delivery is a notification side effect only. It MUST NOT change release or proof state:

- Outbound webhook failures never alter release state.
- Webhook delivery is not settlement confirmation.
- Webhook delivery must never trigger release retry.
- Webhook delivery must never convert `pending` → `failed`.
- Webhook payloads must not be treated as authoritative Arc transaction status.
- Ambiguous Arc outcomes remain governed by reconciliation logic (see `RELEASE_RECONCILIATION_RUNBOOK.md`), not by webhook delivery.

## Proof of settlement

No webhook should be considered proof of on-chain settlement unless explicitly verified through an authoritative source (for example, an approved read-only RPC or explorer receipt check). Webhook delivery success indicates only that a notification was dispatched; it says nothing about the outcome of the underlying transaction.

## Future inbound provider webhooks

Any future inbound provider webhook (for example, provider-delivered transaction events) requires independent authentication and signature verification before its payload is trusted. Inbound payloads remain subject to the same invariant: they are not authoritative on-chain state unless independently verified through an approved source.
