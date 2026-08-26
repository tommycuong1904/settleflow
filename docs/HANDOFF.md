# HANDOFF

## Repository state note (latest)

- Default branch: `main` at `38129aa`; working tree clean; not pushed (`main` is 62 commits ahead of `origin/main`).
- The theme refactor (minimalist black/white CSS-variable design system) was fast-forward merged from `update/theme` into `main`.
- The earlier handoff branch `feat/auth-boundary-v1` was superseded by later wedges; its merge-prep docs (`docs/MERGE_PREP_AUTH_BOUNDARY_V1.md`, `docs/PR_BODY_AUTH_BOUNDARY_V1.md`) are preserved for history.
- Last confirmed checks:
  - `npx tsc --noEmit`
  - `npm run build`
  - `npm test`

## Current Product Checkpoint

SettleFlow is now a website-testable MVP for an Arc-native milestone-based USDC payout workflow.

The core product flow currently available in the repository is:
1. create a payout
2. edit draft payout details and milestones
3. activate payout
4. submit milestone work
5. approve or reject milestone completion
6. queue release after approval
7. refresh settlement proof to confirmed or failed
8. retry a failed release
9. inspect activity history throughout the flow
10. manage contributors from `/contributors` (add/list/search; edit/archive pending)
11. export activity ledger rows as CSV
12. configure and test notification webhooks from `/settings`

## What was completed in the latest execution wedge

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
- dispatcher is wired into milestone events (submission/review/release) and reads URL from `SETTLEFLOW_WEBHOOK_URL` env var

### Unit test layer
- 16 unit test files across `lib/api/*.test.mts` and `lib/repositories/*.test.mts`
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
- no server-side auth/session; the Google sign-in route derives a smart-account address but issues no session/cookie
- actor/workspace resolution still relies on seeded/demo assumptions (`ws-demo`, `payout-1/2`)
- Arc live execution is not yet proven production-safe (`createReleaseExecutor` still returns "not wired yet" failures)
- automated coverage is narrow (unit payload/repository-level only; no route/E2E layer)
- contributor edit/archive is missing; webhook URL is read from env var, not from Settings UI
- some mock/demo artifacts remain in the repository and docs

## Recommended next step
Before expanding feature scope further, prioritize one of these:
1. allow webhook URL to be configured from Settings UI (currently only reads from env var)
2. finish contributor edit/archive (PATCH/DELETE + UI)
3. replace seeded actor/workspace assumptions with real server-side auth/session
4. implement the real Arc release path in `createReleaseExecutor`
