# CURRENT_STATE

Status: current
SSoT: Current repository implementation and verification
Last verified: 2026-08

> **TL;DR** — This file is the **single source of truth** for live numbers/status. Current: Phases 1–6 done (real Arc release via `circle_wallet`), auth implemented, unit suite across `lib/**/*.test.mts` (24/24 green). A5 real-auth E2E flows verified manually against the Vercel preview (`settleflow-dev.vercel.app`) via uncommitted `/tmp/a5_e2e.sh` — 23/23 checks pass (2026-08). If another doc disagrees, this one wins.

## Summary
This repository is now a full-stack Next.js application for SettleFlow, an Arc-native milestone-based USDC payout workflow for crypto teams. The current implementation has moved beyond a frontend-only demo: it now includes a PostgreSQL + Prisma data layer, repository-backed server reads/writes, and API routes for payout, milestone, and release actions. Real Arc release execution is wired through `createReleaseExecutor` (Phase 6): `circle_wallet` mode sends real USDC from a server-side EOA, while `browser_wallet` fails explicitly on the server. Session auth (Phase 4), contributor management + settings/productization (Phase 5), a minimalist black/white theme refactor, and a 24-test unit layer are also merged into `main`.

## Fact vs Assumption Legend
- **Confirmed**: directly verified from repository files or command output.
- **Assumption**: inferred from repository structure, copy, or naming.
- **Unknown**: not verifiable from the current inspection.

## 1. How the project currently works

### Confirmed
- The app is built with **Next.js 16**, **React 19**, and **TypeScript**.
- The main user-visible routes are:
  - `/` (landing)
  - `/dashboard`
  - `/payouts`, `/payouts/new`, `/payouts/[id]`
  - `/contributors`
  - `/activity`
  - `/settings`
  - `/app`
- The product surface routes live inside the `app/(app)` route group.
- The repository now contains a **PostgreSQL + Prisma** persistence layer:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260807140115_init/`
  - `lib/db/client.ts`
- `npx prisma migrate status` reports: **Database schema is up to date**.
- The repository now contains server-side data access via `lib/repositories/`.
- The repository now exposes API routes under `app/api/` and `app/api/v1/` for reads and mutations.
- The create payout flow uses `fetch("/api/v1/payouts", ...)`.
- Contributor loading on the create payout page uses `fetch("/api/v1/contributors?status=active")`.
- Arc configuration is still read from `NEXT_PUBLIC_*` env vars with defaults.
- Arc release behavior is now mode-aware through `sendUsdcOnArc()` and `createReleaseExecutor()`, with `mock`, `demo`, and `real` execution paths. `createReleaseExecutor()` supports `circle_wallet` (server-side EOA via `ARC_SERVER_PRIVATE_KEY`, sends real USDC with viem) and `browser_wallet` (explicit server failure — browser signs via wallet adapter). The executor registers the source wallet on the release record, persists the transaction hash, and refreshes proof on success.
- The app UI was refactored onto a minimalist black/white design system driven by CSS variables (`lib/context/theme-context.tsx`), with modal body-scroll locking (`lib/hooks/use-scroll-lock.ts`); this refactor is merged into `main` (`38129aa`).
- A unit test layer exists under `lib/api/*.test.mts`, `lib/arc/*.test.mts`, `lib/auth/*.test.mts`, `lib/notifications/*.test.mts`, `lib/repositories/*.test.mts`, and `lib/runtime/*.test.mts`; `npm test` runs `node --import tsx --test "lib/**/*.test.mts"` (24 tests).
- A webhook dispatcher (`lib/notifications/webhook-dispatcher.ts`) is wired into milestone repositories and dispatches `milestone_submitted`, `milestone_approved`/`milestone_rejected`, and `milestone_released` events. Webhook destination and per-event notification toggles are now persisted per-workspace (`webhookUrl`, `notifyOnSubmit`, `notifyOnApprove`, `notifyOnRelease` on the `Workspace` record) and managed from the Settings UI via `GET/PUT /api/v1/settings`; `dispatchWorkspaceWebhookNotification()` gates events by toggle and falls back to the env `SETTLEFLOW_WEBHOOK_URL` when no workspace URL is configured. A test endpoint (`POST /api/v1/webhooks/test`) also exists for manual URL verification.
- Contributor records can now be edited (name, wallet, email, role, notes) and archived/restored from the Contributors page via an edit dialog backed by `PATCH /api/v1/contributors/[id]` and repository `updateContributor` (EVM-address validation + duplicate-wallet guard + workspace-scope check).
- **Phase 6 complete**: real Arc release execution is wired. `createReleaseExecutor` with `circle_wallet` mode sends USDC via a viem wallet derived from `ARC_SERVER_PRIVATE_KEY`; native USDC is sent as a plain value transfer, ERC-20 USDC uses `transfer` with 6 decimals. The `browser_wallet` mode returns an explicit server-side failure (the browser signs via wallet adapter). Source wallet address is persisted on the release record, and proof is refreshed on success.

### Assumption
- The repository is transitioning from checkpoint/demo-first implementation toward a more complete application wedge, while still preserving some demo-safe behavior for release execution.

## 2. Current feature surface

### Landing (`/`)
#### Confirmed
- Explains the product proposition.
- Frames the workflow around milestone definition, review, approval, release, and proof.
- Includes CTAs to launch the demo and view the dashboard.
- Includes a shared footer mounted from the app layout.

### Dashboard (`/dashboard`)
#### Confirmed
- Shows high-level payout operations metrics.
- Surfaces milestones waiting for review.
- Shows active payouts and recent settlement proof.
- Is backed by repository-driven server data rather than a purely static route-level mock implementation.

### Create Payout (`/payouts/new`)
#### Confirmed
- Presents a form-like payout agreement builder.
- Loads contributors from `/api/v1/contributors`.
- Submits payout creation through `/api/v1/payouts`.
- Includes milestone structure, wallet, amount, and release framing in the flow.

### Payout Detail (`/payouts/[id]`)
#### Confirmed
- Displays payout summary, milestone workflow, release target, and settlement proof.
- Is backed by repository/API infrastructure rather than route-local hard-coded arrays.
- Supports milestone-specific actions through API routes for:
  - submit
  - approve
  - reject
  - release
- Includes release retry and proof refresh API surfaces.

### Contributors (`/contributors`)
#### Confirmed
- Lists contributors with search, status filter, and settled/payout metrics.
- Add Contributor dialog creates contributors via `POST /api/contributors` (EVM address validation + duplicate-wallet guard).
- Edit/archive of existing contributors is implemented (PATCH `/api/v1/contributors/[id]` + edit dialog with archive/restore toggle).

### Activity Ledger (`/activity`)
#### Confirmed
- Shows payout workflow activity with event-category filters and pagination.
- Includes a CSV export control for the visible activity ledger rows.

### Settings (`/settings`)
#### Confirmed
- Workspace settings surface with webhook URL configuration and a "Test Webhook" action calling `POST /api/v1/webhooks/test`.
- Includes the seeded-role actor/workspace switcher and identity/network surfaces.

## 3. Data, database, and API state

### Confirmed facts
- The repository has a Prisma schema and migration history.
- The configured datasource is PostgreSQL.
- The repository has a seed script at `prisma/seed.js`.
- Vercel deployments (`settleflow-dev.vercel.app`) build with `prisma migrate deploy && prisma generate && npm run build` (see `vercel.json`), so pending Prisma migrations are applied automatically on every deploy — this prevents the DB/schema drift that previously made `/payouts` and `/contributors` return an HTTP 200 app shell with empty content (the deployed DB was missing `Contributor.createdByUserId` from migration `20260828145326_add_contributor_created_by`).
- The repository contains repository modules for:
  - contributors
  - dashboard
  - milestone submission/review/release
  - payout activation/creation/editing/list/detail
  - release proof
  - release retry
  - releases
- The repository contains API routes for:
  - contributors
  - dashboard
  - payouts
  - payout detail
  - payout activation
  - milestone submit/approve/reject/release
  - release detail
  - release retry
  - release proof refresh
  - payout activity (`/api/v1/payouts/[id]/activity`)
  - webhook test (`/api/v1/webhooks/test`)
  - feedback (`/api/v1/feedback`)
  - google auth smart-account derivation (`/api/v1/auth/google`)
- Legacy mock data files still exist in `lib/data/`, but application architecture is no longer accurately described as mock-only.

### Assumptions
- Some mock artifacts are being retained for demo support, fallback logic, or transitional development rather than as the primary application data source.

### Unknown
- Whether all remaining UI surfaces are fully detached from mock-data-era assumptions in every edge case.

## 4. Authentication state

### Confirmed facts
- Search did not find auth-related flows such as `nextauth`, `clerk`, `getServerSession`, or `middleware` in application code.
- No auth middleware or guarded route structure was found.
- The repository now contains a request-derived product context boundary with:
  - header/query/cookie-aware resolution
  - proxy-based context bridging
  - actor switch UX for seeded-role testing
  - route-level permission checks for core mutations
  - UI capability masking for owner / reviewer / contributor actions

### Conclusion
- **Server-side session authentication is implemented for the current MVP flow.**
- Google and wallet auth routes issue signed `sf_session` cookies; `proxy.ts` gates protected API mutations.
- Session-aware handlers resolve the authenticated user and workspace membership into product context.
- Protected session resolution is membership-authoritative: no membership fallback/provisioning is used; multi-workspace sessions require an authorized `workspaceId` selector, and settings updates require the owner/ops boundary.
- Actor identity for core workflow mutations is derived from request/session context rather than trusted client body actor IDs.

### Unknown
- Whether the current permission boundary is intended only as a demo/dev safeguard or as the basis for a future production auth model.
- Whether request-derived product context should later map directly to a real session/user principal or remain a separate testing boundary.

## 5. Build, scripts, and tests

### Confirmed facts
- `package.json` defines:
  - `npm run dev`
  - `npm run build`
  - `npm run start`
  - `npm run lint`
- Prisma seed configuration exists in `package.json#prisma.seed`.
- ESLint is configured via `eslint.config.mjs`.
- TypeScript strict mode is enabled in `tsconfig.json`.
- The repository contains 16 unit test files under `lib/api/*.test.mts` and `lib/repositories/*.test.mts`.
- `npm test` runs `node --import tsx --test "lib/**/*.test.mts"`.
- No Playwright/Jest/Vitest/Cypress end-to-end or browser integration test suites exist yet.

### Notes
- Unit coverage is narrow by design (payload validation + repository logic); route-level integration and E2E coverage are still missing.

## 6. What appears complete

### Confirmed
- Core route structure is present.
- Shared layout, navigation, and footer are implemented.
- Reusable UI component system exists for cards, buttons, statuses, proof display, milestone controls, and shared layout sections.
- A Prisma-backed database layer exists.
- A repository/service-style server data layer exists.
- API surfaces exist for the main payout and milestone actions.
- Product framing docs and reference docs exist; historical/checkpoint docs are archived under `docs/archive/`.
- Arc integration has a mode-aware adapter boundary rather than a single placeholder send stub.

### Assumption
- The repo now has a real application backbone for the payout workflow, even though some execution/auth/test gaps still prevent calling it production-ready.

## 7. What appears unfinished

### Confirmed
- **Phase 4 (auth/session) is complete**: real server-side session auth is now implemented.
  - Google sign-in (`POST /api/v1/auth/google`) issues a signed `sf_session` cookie; wallet sign-in is available at `POST /api/v1/auth/wallet`.
  - `proxy.ts` validates the session for protected API mutations; `lib/auth/session-server.ts` resolves the session to `User` → `WorkspaceMember` → product context.
  - `await getProductContext()` is wired into 16+ API route handlers, replacing the old default fallback.
  - Anonymous mutations are blocked with `401 { error: "AUTH_REQUIRED" }`.
  - Logout (`POST /api/v1/auth/logout`) clears the `sf_session` cookie.
  - 7/7 automated checks pass (`scripts/test-phase4.sh`).
- Mutation routes now have a request-derived actor boundary from the real session (not seeded roles):
  - payout create
  - payout activate
  - payout draft edit
  - milestone submit
  - milestone approve/reject
  - milestone release
  - release proof refresh
  - release retry
- Core UI surfaces now mask actions by actor role and include a header actor switcher for role testing.
- **Dev server runs on port 3001** (port 3000 is occupied by another project, LumenFlow).
- **No committed E2E/browser integration test suite exists**, but A5 (2026-08) manually verified 23 real-auth API flows end-to-end against the Vercel preview `settleflow-dev.vercel.app` via the uncommitted script `/tmp/a5_e2e.sh` (anonymous gate, owner/contributor/reviewer sign-in, contributor create/edit/archive, invalid-wallet + contributor-role policy, payout create/activate, milestone submit/approve/release, settings GET/PUT, webhook test, logout); unit coverage is limited to payload validation and repository logic.
- Arc execution now has a real server-side path (`circle_wallet` via `ARC_SERVER_PRIVATE_KEY`); it is not yet verified as a production-safe live payment path — it still depends on execution mode and a funded server key, and `browser_wallet` fails explicitly on the server.
- Legacy mock-data files remain in the repository and may still represent transition-era coupling or fallback assumptions.

### Assumption
- Additional hardening is still needed around auth, validation depth, production release execution, and failure-path testing.

## 8. Documentation state

### Confirmed
- Technical docs exist in English for README, canonical docs, and reference docs; historical/planning/checkpoint materials are archived under `docs/archive/`.
- Some documentation files were stale after the backend/data wedge and the merged theme refactor, and required refresh against current repository state.
- Archived docs still preserve earlier progress phases under `docs/archive/`.

## 9. Unknowns that require further inspection

- Whether all route handlers return a fully standardized error contract.
- Whether all release/retry/proof-refresh flows have been manually verified end-to-end against the seeded database.
- Whether the `circle_wallet` execution path is fully aligned with official Arc requirements for production release handling (server key custody, gas funding, and fee strategy).
- Historical/checkpoint docs were rationalized into `docs/archive/`; whether remaining reference docs still need refresh is open.


## 10. Confidence statement

### High confidence
- Route structure
- dependency/tooling setup
- presence of database/API/repository layers
- **real server-side session auth (Phase 4) is implemented and verified** (7/7 check pass)
- `/payouts/new` UI is fully light-theme consistent (Phase 5 cleanup complete)
- presence of a narrow unit test layer (`lib/api` + `lib/repositories`); E2E verified manually via A5 script but not committed
- mode-aware Arc send architecture

### Medium confidence
- interpretation that the repo is now beyond frontend-only demo stage
- interpretation that some mock-era files remain for transitional/demo reasons

### Lower confidence / requires more inspection
- production readiness of release execution
- full consistency of all edge-case flows across UI, API, and persistence
- broader deployment/ops story outside the inspected repository surface
