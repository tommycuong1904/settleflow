# Webhook Isolation Policy

Workspace webhook settings are persisted and event toggles gate dispatch. The server-only global fallback is `SETTLEFLOW_WEBHOOK_URL`. `NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL` is client-exposed by design and MUST NOT be treated as a private secret or secure destination.

Staging and production MUST use separate destinations and environment scopes. Prefer an explicit staging destination or disabled delivery during non-transaction verification. An allowlist concept should restrict approved destinations before production use.

Dispatch currently has a five-second timeout, is non-blocking to settlement, and has no durable retry/replay queue. Failures must not trigger release retries or alter proof state. Operators verify destination before deployment and record failures for manual, controlled replay.
