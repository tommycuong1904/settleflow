> **Historical / Superseded — not current SSoT.**

# HANDOFF

## Repository state note (latest)

Current implementation status and verification state are owned by `docs/CURRENT_STATE.md`; this document is a handoff/orientation summary. Authorization and security details are owned by `docs/AUTHORIZATION.md` and `docs/SECURITY_INVARIANTS.md`.

- Verification Status: **FULL SURFACE AUDITED & PASSING** (Auth, Core Payout Workflow, Contributors, Settings/Webhooks, Activity Ledger, Dashboard).
- Real Execution: strictly **fail-closed / disabled**.
- Production DB: **untouched**.
- Last confirmed checks:
  - `npx tsc --noEmit` (0 errors)
  - `npm test` (144/144 tests PASS)

## Current Product Checkpoint

SettleFlow is a fully verified, production-structured Web2.5 MVP for an Arc-native milestone-based USDC payout workflow.

The entire product surface is verified end-to-end:
1. **Authentication & Session**: Google OAuth Smart Account + Web3 Wallet signing, session cookies, owner/reviewer/contributor role derivation, Preview reload verified.
2. **Core Payout Workflow**: Create payout agreement (`/payouts/new`), edit drafts, activate agreement, submit deliverables with proof links, approve/reject reviews, queue Arc release, inspect settlement proof.
3. **Contributors Directory**: Add, search, edit, archive/restore, delete guard (`assertContributorDeletable`), direct payout creation link.
4. **Settings & Webhooks**: Workspace profile, per-event toggles (`Submit`, `Approve`, `Release`), secure test webhook dispatcher (Owner-only).
5. **Activity Ledger**: Comprehensive deduplicated audit trail, event filter pills, pagination, and CSV export.
6. **Dashboard**: Live metric cards, priority queue next-actions, active payouts progress, and recent settlement proof tabs.

## What was completed in the latest execution wedge

### Workspace webhook settings + contributor edit/archive wedge
- `prisma/schema.prisma` — added `webhookUrl`, `notifyOnSubmit`, `notifyOnApprove`, `notifyOnRelease` columns to `Workspace`
- `lib/repositories/workspace-settings.ts` — `getWorkspaceSettings` / `updateWorkspaceSettings` with defaults and webhook URL validation/trim
- `app/api/v1/settings/route.ts` — `GET` loads workspace settings, `PUT` persists with validation
- `lib/notifications/webhook-dispatcher.ts` — added `eventNotificationToggle()` (maps events to toggles) and `dispatchWorkspaceWebhookNotification()` (gates by toggle, falls back to env URL)
- Milestone repositories (`submission`, `review`, `release`) — switched to workspace-aware dispatch via injectable `notify` callback
- `app/(app)/settings/page.tsx` — loads persisted settings on mount; webhook URL field + toggle checkboxes now wired to `/api/v1/settings`
- `lib/repositories/contributors.ts` — added `updateContributor()` with EVM validation, duplicate-wallet guard, workspace-scope check
- `app/api/v1/contributors/[id]/route.ts` — `PATCH` endpoint with per-field validation
- `components/contributors/edit-contributor-dialog.tsx` — edit form + archive/restore toggle, follows add-dialog pattern
- `components/contributors/contributor-list-client.tsx` — owner-only "Edit" button, edit modal wiring, `router.refresh()` on success

### Workflow hardening
- draft payout editing now has a real in-app harness on payout detail
- draft updates refresh activity automatically
- draft update responses now return richer payloads so the client syncs closer to server truth
- payout activity refresh now also runs after non-draft workflow actions
- review, release, proof refresh, and retry mutations now return richer workflow data

### Theme refactor (merged into `main` at `38129aa`)
- minimalist black/white design system driven by CSS variables
- shared `useScrollLock` hook for open modals
- applied across app pages, shared components, auth modal, and feedback modal

### Contributor management wedge
- `/contributors` page with search/status filters and per-contributor metrics
- Add Contributor dialog with EVM address validation + duplicate-wallet guard
- `POST /api/contributors` + repository `createContributor`

### Activity + reporting wedge
- activity ledger CSV export on `/activity`

### Notifications wedge
- `lib/notifications/webhook-dispatcher.ts` (Discord embed builder + generic payload)
- `POST /api/v1/webhooks/test` + "Test Webhook" action in Settings
- dispatcher is wired into milestone events (submission/review/release); webhook URL + per-event toggles are now persisted per-workspace via `GET/PUT /api/v1/settings`, with the `SETTLEFLOW_WEBHOOK_URL` env var kept as a fallback

### Unit test layer
- Full unit suite across `lib/**/*.test.mts` (current count: see `docs/CURRENT_STATE.md`)
- `npm test` = `node --import tsx --test "lib/**/*.test.mts"`

### Runtime verification
Confirmed during the latest checkpoint:
- `npx tsc --noEmit` passes
- `npm run build` passes
- `GET /` returns `200`
- `GET /dashboard` returns `200`
- `GET /payouts/new` returns `200`
- `GET /payouts/[id]` returns `200`
- `GET /contributors`, `GET /activity`, `GET /settings` return `200`
- `GET /api/v1/dashboard` returns stats
- `POST /api/v1/webhooks/test` with a webhook URL returns success/failure
- `GET /api/v1/contributors?status=active` returns active contributors
- `GET /api/v1/payouts` returns payout data
- `GET /api/v1/payouts/[id]?workspaceId=ws-demo` returns real payout detail data

## Product status

### Done enough for today’s MVP checkpoint
- landing, dashboard, create payout, and payout detail all exist and load
- persistence-backed payout workflow exists
- payout detail supports the main state transitions
- proof and retry surfaces exist
- activity timeline updates through the main workflow
- release execution remains mode-aware behind the Arc execution boundary

### Still not the same as production-ready
- **Phase 4 (auth/session) is now implemented and verified** (JWT cookie + DB User/WorkspaceMember → `getProductContext()`; 7/7 tests pass). Anonymous mutations blocked; real role-based scoping works.
- `/payouts/new` UI is fully light-theme consistent (Phase 5 remnant cleanup complete).
- Arc live execution is wired (Phase 6): `circle_wallet` (server EOA via `ARC_SERVER_PRIVATE_KEY`) sends real USDC and persists proof + source wallet; `browser_wallet` fails explicitly on the server. Production-safe verification and operational hardening are still pending.
- automated coverage is narrow (unit payload/repository-level only; no route/E2E layer).
- some mock/demo artifacts remain in the repository and docs.
- **Dev server**: use `npx next dev -p 3001` (port 3000 is occupied by LumenFlow).

## Live Product Checkpoint — LIVE PRODUCT VERIFIED & PASS

### Live Product URL
`https://settleflow-dev.vercel.app`

### Verified Features (All PASS)
| Surface | Status |
|---------|--------|
| Auth & Session (Google OAuth + Web3 Wallet + Session Persistence + Logout/Relogin + RBAC) | ✅ PASS (FULLY VERIFIED) |
| Core Payout Workflow (Create → Activate → Submit → Approve/Reject → Release → Proof) | ✅ PASS |
| Contributors Directory (Add / Edit / Archive / Delete Guard / Search) | ✅ PASS |
| Settings & Webhooks (URL validation, per-event toggles, Owner-only test) | ✅ PASS |
| Activity Ledger (Filter, pagination, deduplication, CSV export) | ✅ PASS |
| Dashboard (Metric cards, priority queue, active payouts, settlement proofs) | ✅ PASS |

### Test Results
- Unit tests: **144/144 PASS** (`npm test`)
- Critical-path Integration suite: **PASS** (`test/integration/critical-path-e2e.test.mts`)
- DB-backed Integration suite: **PASS** (`npm run test:integration:db`)
- TypeScript: **0 errors** (`npx tsc --noEmit`)
- Production build: **PASS** (`npm run build`)

### Known Limitations
1. **No committed browser E2E suite** (Playwright/Cypress). Critical-path coverage is DB/API-backed integration tests on Node runner.
2. **Webhook dispatcher** uses direct non-blocking dispatch with 5s timeout; no persistent background retry queue.
3. **Legacy mock data files** (`lib/data/*.ts`) remain for reference/demo fallback.
4. **Real Arc execution remains strictly fail-closed/disabled.** `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION` must remain unset/disabled.

### Security & Safety Status
- Production database: **completely untouched**.
- Real onchain transactions: **zero sent**.
- Real funds: **zero moved**.
- Secrets: **zero exposed/printed**.
- `isServerRealExecutionAuthorized()` returns `false` on Staging.

### Operational Prerequisites (Before Enabling Real Onchain Execution)
1. **Verified secret custody & rotation workflow** for `ARC_SERVER_PRIVATE_KEY` with dedicated HSM/vault.
2. **Bounded transaction limits & recipient allowlists** enforced at protocol/infrastructure level.
3. **Formal multi-stakeholder authorization** to enable `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION=enabled`.
4. **Funded server wallet** on Arc network with verified gas balance and monitoring alerts.
5. **Automated reconciliation daemon** actively monitoring settlement status onchain against DB records.
6. **Incident response runbook** tested with clear rollback & key-compromise procedures (see `docs/INCIDENT_RESPONSE_RUNBOOK.md`).
7. **Production webhook destination isolation** strictly verified.

## Recommended next step
Follow the runbooks in `docs/OPERATIONS_RUNBOOK.md` before any Production infrastructure or transaction work. The immediate next action is **provisioning Production database and secrets** under Infrastructure Operator ownership.
