# Known Issues

Status: current
Last verified: 2026-09

This document records current, evidence-backed limitations. Historical audits and checkpoints belong under `docs/archive/` and do not override runtime code, Prisma, or CI.

## Verified completed work

- Authentication uses signed `sf_session` cookies, proxy mutation gating, and persisted `User` plus `WorkspaceMember` context.
- `WorkspaceMember` enforces one row per `(workspaceId, userId)`. Its migration stops with a diagnostic when historical multi-role data exists; it never picks or deletes a role automatically.
- Owner-created invitations are workspace/role/optional-email bound. Acceptance is atomic, single-use, expiry-aware, and preserves an existing membership role.
- CI verifies Prisma generation and migrations on isolated PostgreSQL, typecheck, lint, unit tests, DB integration tests, and the production build. It uses Arc mock mode.

## Current limitations

### Browser E2E is deferred

- No committed Playwright or browser E2E suite exists.
- This is intentional. CI covers server/unit/DB integration behavior only.

### Real Arc settlement and confirmation are deferred

- The code contains a real-mode executor, but repository checks do not authorize or submit real Arc transactions.
- Arc-confirmation integration cases that require independently verified transactions are intentionally skipped.
- Production payment readiness still requires external controls including secret custody, transaction limits, reconciliation, and explicit release authorization.

### Webhook delivery is best-effort

- Milestone events dispatch after the database transaction through a non-blocking call.
- The dispatcher has a timeout and destination validation, but no persisted delivery record, retry queue, replay, or user-visible terminal failure.

### Legacy API compatibility surface remains

- `/api/payouts`, `/api/contributors`, and `/api/dashboard` remain active compatibility routes; corresponding v1 routes reuse some of those handlers.
- The legacy money-movement endpoint `/api/release` is intentionally disabled with HTTP 410.
- The route families have not yet been consolidated into a single documented canonical API surface.

### Documentation outside this file may be historical

- Archived docs are reference material only.
- Supporting deployment and operational documentation requires environment-specific verification before a release decision.

## Non-runtime artifacts

- `lib/data/` still contains mock records, but no runtime imports were found in application code. They are repository cleanup work, not a current data-path dependency.
