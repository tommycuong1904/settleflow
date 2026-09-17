# CURRENT_STATE

Status: current
SSoT: Current repository implementation and verification
Last verified: 2026-09

> **TL;DR** — Core auth, workspace membership, invitation, release-safety, Prisma migration, unit, DB integration, and production-build checks are verified on the current working tree. Real Arc settlement and browser E2E remain deferred; repository verification does not authorize production payments.

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
- Unit tests under `lib/**/*.test.mts` and DB-backed integration tests under `test/integration/` pass in CI. CI also verifies Prisma generation/migrations, typecheck, lint, and the production build against an isolated PostgreSQL database. This is evidence for covered paths, not complete production readiness.
- A webhook dispatcher (`lib/notifications/webhook-dispatcher.ts`) is wired into milestone repositories and dispatches `milestone_submitted`, `milestone_approved`/`milestone_rejected`, and `milestone_released` events. Webhook destination and per-event notification toggles are now persisted per-workspace (`webhookUrl`, `notifyOnSubmit`, `notifyOnApprove`, `notifyOnRelease` on the `Workspace` record) and managed from the Settings UI via `GET/PUT /api/v1/settings`; `dispatchWorkspaceWebhookNotification()` gates events by toggle and falls back to the env `SETTLEFLOW_WEBHOOK_URL` when no workspace URL is configured. A test endpoint (`POST /api/v1/webhooks/test`) also exists for manual URL verification.
- Contributor records can now be edited (name, wallet, email, role, notes) and archived/restored from the Contributors page via an edit dialog backed by `PATCH /api/v1/contributors/[id]` and repository `updateContributor` (EVM-address validation + duplicate-wallet guard + workspace-scope check).
- **Arc execution is implemented in code but operationally unverified**: `createReleaseExecutor` supports `circle_wallet` through `ARC_SERVER_PRIVATE_KEY`; `browser_wallet` returns an explicit server-side failure. Source wallet address and proof data are persisted on successful execution.

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
- RPC Node health check and non-custodial Smart Account private key export modal. Google export derives from the server-verified Google subject, so importing it into a browser wallet yields the same address.

## 3. Data, database, and API state

### Confirmed facts
- The repository has a Prisma schema and migration history.
- The configured datasource is PostgreSQL.
- The repository has a seed script at `prisma/seed.js`.
- `WorkspaceMember` enforces exactly one role per `(workspaceId, userId)`. The migration fails safely when historical duplicate role rows exist rather than choosing a role automatically.
- A verified account with no memberships can explicitly create its first workspace through `POST /api/v1/workspaces`. The server locks that user, creates the workspace and its Owner membership in one transaction, and selects it for the new session. Authentication never grants access to an existing workspace; invitation acceptance remains the path to join one.
- Invitation records are workspace-, role-, expiry-, and optional-email-bound. Acceptance is atomic, single-use, and preserves an existing membership role through the workspace/user uniqueness invariant.
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
  - google auth smart-account derivation (`/api/v1/auth/google`)
- Legacy mock data files still exist in `lib/data/`, but no runtime imports were found in application code.

### Known limitation
- The mock artifacts are transitional repository clutter, not a verified runtime data source.

## 4. Authentication state

### Authorization adversarial audit — confirmed
- DB-backed authorization tests passed against the dedicated `settleflow_test` database.
- Cross-workspace isolation and same-workspace Contributor A/B isolation were verified for the tested resource/read paths.
- Unauthorized Contributor mutations against another Contributor's resources were blocked.
- Rejected mutations left the checked database state unchanged.
- The completed tests found **0 confirmed authorization vulnerabilities**.

### Authorization items not verified
- Dedicated direct read routes for milestone, submission, review, and transaction proof were not separately covered.
- The active legacy `/api/*` compatibility surface and `/api/v1/*` aliases are not yet consolidated under one canonical route family.
- Complete forged cookie/header/body identity coverage remains unverified.

### Confirmed facts
- The application uses signed `sf_session` cookies, `proxy.ts` mutation gating, and database-backed `User`/`WorkspaceMember` context resolution; it does not use NextAuth, Clerk, or `getServerSession`.
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
- Protected session resolution is membership-authoritative: no membership fallback/provisioning is used; multi-workspace sessions require an authorized `workspaceId` selector. A user has one persisted role per workspace; owner-only settings and invitation actions are enforced by policy.
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
  - `npm run typecheck`
  - `npm run lint`
- Prisma seed configuration exists in `package.json#prisma.seed`.
- ESLint is configured via `eslint.config.mjs`.
- TypeScript strict mode is enabled in `tsconfig.json`.
- `npm test` discovers and runs all unit test files under `lib/`; `npm run test:integration:db` does the same for `test/integration/`.
- CI runs dependency installation, Prisma generation and migrations on `settleflow_test`, typecheck, lint, unit tests, DB integration tests, and `npm run build`.
- No committed Playwright/browser E2E suite exists; browser E2E is intentionally deferred.

### Notes
- Unit and DB integration coverage includes authorization, membership uniqueness, invitations, and release reliability. Three Arc-confirmation integration cases are intentionally skipped because they require independently verified transactions; no real transaction is submitted by CI.

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
- **Authentication, membership, and invitations (verified in code and DB integration):** Google and verified-wallet sign-ins establish or reuse a persisted user identity but never self-grant workspace membership; signed sessions resolve permissions only from persisted workspace memberships. Invitations are owner-created, atomically accepted, email-bound when specified, and cannot create a second workspace role.
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
- **Dev server runs on port 3000**.
- Browser E2E is intentionally deferred.
- Arc execution has a server-side path, but real settlement and confirmation are intentionally deferred. CI forces mock execution and no real Arc credentials are configured.
- Webhook delivery is non-blocking and has no durable retry/replay queue.

### Assumption
- Additional hardening is still needed around auth, validation depth, production release execution, and failure-path testing.

## 8. Documentation state

### Confirmed
- Technical docs exist in English for README, canonical docs, and reference docs; historical/planning/checkpoint materials are archived under `docs/archive/`.
- `CURRENT_STATE.md` and `KNOWN_ISSUES.md` are reconciled with the current schema, CI, and verified checks; supporting documentation may still need environment-specific verification.
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
- real server-side session auth is implemented and verified by unit and DB integration coverage
- `/payouts/new` UI is fully light-theme consistent (Phase 5 cleanup complete)
- CI verification of typecheck, lint, unit, migrations, DB integration, and production build
- mode-aware Arc send architecture

### Medium confidence
- interpretation that the repo is now beyond frontend-only demo stage
- interpretation that some mock-era files remain for transitional/demo reasons

### Lower confidence / requires more inspection
- production readiness of release execution
- broader deployment/ops story outside the inspected repository surface

## 11. Historical verification notes — re-verification required

The following claims were recorded by earlier checkpoints but are not re-verified by this documentation cleanup: live deployment status, live API/database checks, and the historical live URL. Treat them as historical evidence only; run fresh checks before relying on them. Current repository checks are enforced by CI without hardcoding test counts.
