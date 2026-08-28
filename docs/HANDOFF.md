# HANDOFF

## Repository state note (latest)

- Default branch: `main` at `32a0bf9` (Phase 6 merged fast-forward from `feature/settings-contributor-export`); pushed to `origin/main`.
- The Phase 6 wedge (real Arc release execution) was fast-forward merged into `main`.
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
10. manage contributors from `/contributors` (add/list/search/edit/archive)
11. export activity ledger rows as CSV
12. configure and test notification webhooks from `/settings`

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
- 126 tests across `lib/api/*.test.mts`, `lib/arc/*.test.mts`, `lib/auth/*.test.mts`, `lib/notifications/*.test.mts`, `lib/repositories/*.test.mts`, and `lib/runtime/*.test.mts`
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

## Recommended next step
Real Arc release execution (Phase 6) is now wired. The next priorities are:
1. **Verify real Arc release execution on staging** (fund a server EOA with native USDC, confirm a `circle_wallet` release produces a real tx hash + Arcscan proof).
2. Add route-level integration + E2E test coverage (Phase 7).
3. Clean up legacy mock/demo artifacts and finalize ops docs (Phase 8).
