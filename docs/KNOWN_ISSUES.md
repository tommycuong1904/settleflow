# KNOWN_ISSUES

## Purpose
This document lists issues, gaps, inconsistencies, and inspection risks visible from the current repository state.

## Fact vs Assumption Legend
- **Confirmed**: directly verified from files or command output.
- **Assumption**: inferred but not fully proven.
- **Unknown**: requires further inspection.

## Confirmed Issues and Gaps

### 1. Auth/session is implemented; broader browser coverage remains
- Real server-side session auth (JWT cookie + middleware + DB User/WorkspaceMember → `getProductContext()`) is implemented across 16+ API routes (Phase 4). Anonymous mutations are blocked with `401 { error: "AUTH_REQUIRED" }`.
- Route-level DB-backed integration coverage is committed and verified. Broader browser/E2E coverage remains limited.

### 2. Automated test coverage is still narrow
- Unit tests exist across `lib/**/*.test.mts` (current count: see `docs/CURRENT_STATE.md`); `npm test` runs `node --import tsx --test "lib/**/*.test.mts"`.
- Coverage includes DB-backed authorization and route-level release reliability. No committed browser/E2E suite exists, and deterministic concurrency remains deferred.

### 3. Arc release execution is wired but not yet proven production-safe
- `lib/arc/release-executor.ts` now supports `circle_wallet` (real server-side EOA execution via viem) and `browser_wallet` (server-side failure — browser signs via wallet adapter). `sendUsdcOnArc()` in `lib/arc/onchain.ts` coordinates the send and proof update.
- Real-mode execution is confirmed at the unit-test level but has not been verified as a production-safe end-to-end live release path against official Arc execution requirements.
- `sendUsdcOnArc()` still returns synthetic results in `mock` and `demo` modes.

### 3a. Reliability Hardening checkpoint
- **Completed:** checkpoint `6004b05` verifies isolated PostgreSQL integration, route-level authorization/release reliability, failure/retry/proof-refresh/idempotency behavior, and safe non-executing test paths.
- Real Arc/RPC transactions, real funds, production signing keys, and production webhooks were not used.
- Deterministic concurrency coverage remains deferred because no dedicated concurrency primitive has been introduced.

## Fixed Code Issues

### Settings error contract — FIXED
- `GET /api/v1/settings` now maps missing or unauthorized membership context to `AUTH_CONTEXT_REQUIRED` / HTTP 403.
- Unexpected settings failures remain HTTP 500. The fix is checkpointed at `b74925e`; no authorization bypass was identified.

## Operational Readiness Blockers

- Deployment/database environment isolation, secret custody and rotation, staging wallet/funding controls, monitoring, reconciliation, incident recovery, and webhook destination isolation are not yet operationally verified.
- Real Arc execution remains **NOT AUTHORIZED**.

## Deferred Hardening

- Deterministic concurrency coverage, durable idempotency, transaction limits/recipient allowlists, ambiguous transaction automation, and browser/E2E expansion remain deferred pending roadmap approval.

### 4. Legacy mock-data artifacts remain in the repository
- `lib/data/` still contains:
  - `mock-contributors.ts`
  - `mock-payouts.ts`
  - `mock-milestones.ts`
  - `mock-transaction-proofs.ts`
- The repository is no longer accurately described as mock-only, but these files can still create confusion about the true source of data.

### 5. Documentation drift risk after recent wedges
- `docs/CURRENT_STATE.md`, `docs/KNOWN_ISSUES.md`, and `docs/PROJECT_MAP.md` had become stale relative to the repository state (backend/data wedge, then the merged theme refactor, contributor management, activity CSV export, and webhook scaffolding).
- This creates a risk that future work is planned from outdated assumptions unless canonical docs are kept in sync with code.

### 6. Potential route-map/documentation drift in supporting docs
- Historical/checkpoint/planning docs now live under `docs/archive/`; they may still reflect earlier frontend-first assumptions or pre-backend wording and are not current truth.
- They were not all fully re-audited in this pass.

### 7. Webhook dispatcher URL source (partially resolved)
- The dispatcher is wired into `lib/repositories/milestone-submission.ts`, `milestone-review.ts`, and `milestone-release.ts` for `milestone_submitted`, `milestone_approved`/`milestone_rejected`, and `milestone_released` events.
- **Resolved:** the Settings UI webhook input now persists per-workspace (`webhookUrl` + `notifyOnSubmit`/`notifyOnApprove`/`notifyOnRelease` toggles) via `GET/PUT /api/v1/settings`; `dispatchWorkspaceWebhookNotification()` gates events by toggle and falls back to `SETTLEFLOW_WEBHOOK_URL` when no workspace URL is set.
- **Remaining:** no webhook replay/retry queue beyond a 5s dispatch timeout; dispatch failures are non-blocking and not surfaced to users.

## Confirmed Inconsistencies

### 1. Canonical docs previously described the app as having no backend/API/database
- The repository now contains:
  - Prisma schema and migration history
  - a PostgreSQL datasource
  - repository modules under `lib/repositories/`
  - API routes under `app/api/` and `app/api/v1/`
- Any doc claiming there is no backend, no API, or no DB layer is now inaccurate.

### 2. Project structure docs previously described only shallow frontend routes and libraries
- The repository now includes additional route handlers, DB client code, repository modules, and Arc execution helpers that were absent from older structure docs.

## Assumptions / Likely Risks

### 1. Transitional architecture may still hide mock-era coupling
- **Assumption**: some UI or helper flows may still carry assumptions from the earlier mock-data phase even though the primary architecture now includes persistence and API routes.

### 2. Release/retry/proof flows may still need broader failure-path verification
- **Assumption**: once live execution becomes important, retry semantics, proof refresh behavior, and release state transitions will need deeper adversarial/manual validation.

### 3. Public application surface still carries risk despite minimal permissions
- **Assumption**: the current session-aware permission checks reduce obvious mutation risk, but broader production hardening and route-level coverage remain necessary as backend capabilities expand.

## Unknown Areas Requiring Further Inspection

### 1. Authorization model
- The current session-aware actor and workspace policy is implemented; future role refinements or additional boundaries are not verified as requirements.

### 2. Production Arc requirements
- Unknown whether the current real-mode executor is fully sufficient under official Arc documentation and deployment constraints.

### 3. Error-contract consistency
- Unknown whether all route handlers expose consistent status codes and response shapes across success/failure paths.

### 4. Data migration / reseeding workflow
- Unknown whether the current migration + seed workflow is stable enough for repeated developer resets across environments.
- **Partially resolved (Aug 28):** `vercel.json` build command now runs `prisma migrate deploy` before `prisma generate && npm run build`, so deployed environments apply pending migrations automatically on each deploy. This fixed the `/payouts` and `/contributors` empty-content bug (HTTP 200 shell without page data) caused by the deployed DB missing migration `20260828145326_add_contributor_created_by` (`Contributor.createdByUserId`), which `listContributors` selects. `npx prisma migrate deploy` still requires the build to reach the database.

## Highest-Risk Areas

### Confirmed high-risk
1. **Narrow automated test coverage (no route/E2E layer)**
3. **Production readiness of Arc release execution remains unverified**
4. **Stale supporting docs can mislead future work**
5. **Mock-era artifacts may blur architecture understanding**

## Safest Next Technical Investigation

### Recommended
- Audit route-by-route consistency across:
  - repository reads/writes
  - allowed state transitions
  - error responses
  - release/retry/proof-refresh flows
- Contributor edit/archive (PATCH + UI) and Settings-UI webhook URL persistence are now implemented (see `docs/HANDOFF.md`); the remaining safe next step is the smallest real auth/session boundary before broader feature expansion.
- Then define the smallest real auth/session boundary before broader feature expansion.

### Why this is safest
- It builds on the new persistence/API backbone without broad rewrites.
- It reduces the risk of compounding undocumented backend behavior.
- It keeps future Arc integration aligned with explicit state and permission boundaries.
