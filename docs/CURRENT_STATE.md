# CURRENT_STATE

Status: current
SSoT: Current repository implementation and verification
Last verified: 2026-08

> **TL;DR** — This file is the single source of truth for current implementation status. The repository contains the implemented surfaces described below; live-deployment and checkpoint claims are retained only where explicitly labeled and must be re-verified before release decisions. On the current working tree, `npm test` passes 144/144. Real Arc execution must not be inferred as operationally authorized from repository tests alone.

## Summary
This repository is now a full-stack Next.js application for SettleFlow, an Arc-native milestone-based USDC payout workflow for crypto teams. The current implementation has moved beyond a frontend-only demo: it now includes a PostgreSQL + Prisma data layer, repository-backed server reads/writes, and API routes for payout, milestone, and release actions. Real Arc release execution is wired through `createReleaseExecutor` (Phase 6): `circle_wallet` mode sends real USDC from a server-side EOA, while `browser_wallet` fails explicitly on the server. Session auth (Phase 4), contributor management + settings/productization (Phase 5), a minimalist black/white theme refactor, and the `6004b05` Reliability Hardening test coverage are merged into `main`.

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
- A unit test layer exists under `lib/**/*.test.mts`, and committed DB-backed integration tests exist under `test/integration/`. The Reliability Hardening checkpoint (`6004b05`) and the Phase 4C safety-hardening checkpoint (`0cfc321`) verified `npm test` (144/144), `npm run test:integration:db` (10/10), and TypeScript. This is evidence for covered paths, not complete production readiness.
- A webhook dispatcher (`lib/notifications/webhook-dispatcher.ts`) is wired into milestone repositories and dispatches `milestone_submitted`, `milestone_approved`/`milestone_rejected`, and `milestone_released` events. Webhook destination and per-event notification toggles are now persisted per-workspace (`webhookUrl`, `notifyOnSubmit`, `notifyOnApprove`, `notifyOnRelease` on the `Workspace` record) and managed from the Settings UI via `GET/PUT /api/v1/settings`; `dispatchWorkspaceWebhookNotification()` gates events by toggle and falls back to the env `SETTLEFLOW_WEBHOOK_URL` when no workspace URL is configured. A test endpoint (`POST /api/v1/webhooks/test`) also exists for manual URL verification.
- Contributor records can now be edited (name, wallet, email, role, notes) and archived/restored from the Contributors page via an edit dialog backed by `PATCH /api/v1/contributors/[id]` and repository `updateContributor` (EVM-address validation + duplicate-wallet guard + workspace-scope check).
- **Phase 6 complete**: real Arc release execution is wired. `createReleaseExecutor` with `circle_wallet` mode sends USDC via a viem wallet derived from `ARC_SERVER_PRIVATE_KEY`; native USDC is sent as a plain value transfer, ERC-20 USDC uses `transfer` with 6 decimals. The `browser_wallet` mode returns an explicit server-side failure (the browser signs via wallet adapter). Source wallet address is persisted on the release record, and proof is refreshed on success.

### Operational boundary

- Production auth secret fail-closed behavior and the Settings `AUTH_CONTEXT_REQUIRED` → HTTP 403 contract are implemented in code and checkpointed at `b74925e`; Phase 4C safety hardening (ARC executor, webhook isolation, and the release-per-milestone migration) is checkpointed at `0cfc321`.
- Passing unit/integration tests and an implemented Arc executor are not operational or production payment verification.
- Deployment isolation, secret custody, staging wallet controls, monitoring, reconciliation, incident recovery, and webhook isolation remain required before real Arc staging.
- See `docs/OPERATIONS_RUNBOOK.md` and linked runbooks. Real Arc remains **NOT AUTHORIZED**.

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
- Fully verified and audit-passing.
- Shows high-level payout operations metrics (Active payouts, Milestones awaiting review, Settlements in flight, Outstanding exposure).
- Priority queue banner with smart next-action routing.
- Tabs for Pending Review, Active Payouts, and Recent Settlement Proofs backed by repository-driven server data.
- Workspace isolation and live data refresh verified.

### Create Payout (`/payouts/new`) & Payout Detail (`/payouts/[id]`)
#### Confirmed
- Core Payout Workflow fully audited and verified: Create → Activate → Submit → Approve / Reject → Release → Proof.
- Recipient auto-fill from query params (`?contributorId=...`).
- Role-based action masking: Owner (activate, release, retry), Reviewer (approve/reject), Contributor (submit/resubmit).
- Release execution remains fail-closed / disabled for real transactions.

### Contributors (`/contributors`)
#### Confirmed
- Fully verified and audit-passing.
- Lists contributors with real-time search, status filter (all/active/archived), and settled/payout metrics.
- Add Contributor dialog creates contributors via `POST /api/contributors` (EVM address validation + duplicate-wallet guard).
- Edit/archive/restore dialog via `PATCH /api/v1/contributors/[id]`.
- Delete dialog with hard-delete guard (`assertContributorDeletable`) preventing deletion of contributors with payouts.
- Direct "New Payout" integration.

### Activity Ledger (`/activity`)
#### Confirmed
- Fully verified and audit-passing.
- Shows comprehensive cryptographic audit trail with category filters (`All`, `Proofs & Releases`, `Approvals`, `Submissions`) and pagination.
- Deduplication across `activityLog` and `transactionProof`.
- CSV export functionality.

### Settings (`/settings`)
#### Confirmed
- Fully verified and audit-passing.
- Webhook URL configuration with HTTP/HTTPS format validation.
- Per-event notification toggles (`notifyOnSubmit`, `notifyOnApprove`, `notifyOnRelease`) persisted to Workspace record.
- Webhook Test Action calling `POST /api/v1/webhooks/test` secured with session auth & Owner-only enforcement.
- RPC Node health check and non-custodial Smart Account private key export modal.

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

### Authorization adversarial audit — confirmed
- DB-backed authorization tests passed against the dedicated `settleflow_test` database.
- Cross-workspace isolation and same-workspace Contributor A/B isolation were verified for the tested resource/read paths.
- Unauthorized Contributor mutations against another Contributor's resources were blocked.
- Rejected mutations left the checked database state unchanged.
- The completed tests found **0 confirmed authorization vulnerabilities**.

### Authorization items not verified
- Dedicated direct read routes for milestone, submission, review, and transaction proof were not separately covered.
- Full legacy `/api/**` versus `/api/v1/**` authorization parity remains unverified.
- Multi-role privilege escalation, the intended scope of `ops` → `owner`, and complete forged cookie/header/body coverage remain unverified.

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
- Unit coverage remains limited in scope, but DB-backed route-level authorization and release reliability coverage is now committed. A committed browser/E2E suite and deterministic concurrency coverage remain deferred.

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
- **Authentication & Session Lifecycle (VERIFIED on Live Product)**:
  - Google OAuth sign-in (`POST /api/v1/auth/google`) issues a signed HMAC-SHA256 `sf_session` cookie with Smart Account derivation.
  - Dashboard loads immediately after authentication.
  - Full session persistence verified on hard reload (F5) without 403 / auth interruption.
  - Logout (`POST /api/v1/auth/logout`) reliably invalidates and clears the `sf_session` cookie.
  - Re-login cycle verified and succeeds smoothly.
  - Membership RBAC & product context (`Owner`, `Reviewer`, `Contributor`) correctly preserved and derived.
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
- broader deployment/ops story outside the inspected repository surface

## 11. Historical verification notes — re-verification required

The following claims were recorded by earlier checkpoints but are not re-verified by this documentation cleanup: live deployment status, live API/database checks, TypeScript/build results, critical-path integration results, and the historical live URL. Treat them as historical evidence only; run fresh checks before relying on them. The current test result recorded by this task is `npm test`: 144/144 pass.
