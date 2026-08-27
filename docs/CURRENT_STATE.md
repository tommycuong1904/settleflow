# CURRENT_STATE

## Summary
This repository is now a full-stack Next.js application for SettleFlow, an Arc-native milestone-based USDC payout workflow for crypto teams. The current implementation has moved beyond a frontend-only demo: it now includes a PostgreSQL + Prisma data layer, repository-backed server reads/writes, and API routes for payout, milestone, and release actions. Arc release execution still remains environment-mode dependent rather than production-complete. A theme refactor (minimalist black/white CSS-variable design system) has been merged into `main` at `38129aa` (via branch `update/theme`), and the repo now also ships a narrow unit test layer plus contributor-management, activity-CSV-export, and webhook-scaffolding wedges.

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
- Arc release behavior is now mode-aware through `sendUsdcOnArc()` and `createReleaseExecutor()`, with `mock`, `demo`, and `real` execution paths. `createReleaseExecutor()` is still a placeholder that returns "not wired yet" failures.
- The app UI was refactored onto a minimalist black/white design system driven by CSS variables (`lib/context/theme-context.tsx`), with modal body-scroll locking (`lib/hooks/use-scroll-lock.ts`); this refactor is merged into `main` (`38129aa`).
- A unit test layer exists under `lib/api/*.test.mts` and `lib/repositories/*.test.mts`; `npm test` runs `node --import tsx --test "lib/**/*.test.mts"`.
- A webhook dispatcher (`lib/notifications/webhook-dispatcher.ts`) is wired into milestone repositories and dispatches `milestone_submitted`, `milestone_approved`/`milestone_rejected`, and `milestone_released` events. Webhook destination and per-event notification toggles are now persisted per-workspace (`webhookUrl`, `notifyOnSubmit`, `notifyOnApprove`, `notifyOnRelease` on the `Workspace` record) and managed from the Settings UI via `GET/PUT /api/v1/settings`; `dispatchWorkspaceWebhookNotification()` gates events by toggle and falls back to the env `SETTLEFLOW_WEBHOOK_URL` when no workspace URL is configured. A test endpoint (`POST /api/v1/webhooks/test`) also exists for manual URL verification.
- Contributor records can now be edited (name, wallet, email, role, notes) and archived/restored from the Contributors page via an edit dialog backed by `PATCH /api/v1/contributors/[id]` and repository `updateContributor` (EVM-address validation + duplicate-wallet guard + workspace-scope check).

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
- Edit/archive of existing contributors is not implemented yet.

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
- **No authentication flow is currently implemented in the inspected repository.**
- **A stronger auth-shaped boundary now exists for the seeded workspace model, but it is still not a full auth system.**
- **Actor identity for core workflow mutations is now derived from request product context rather than client-supplied body actor IDs.**

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
- Product framing docs and checkpoint docs exist.
- Arc integration has a mode-aware adapter boundary rather than a single placeholder send stub.

### Assumption
- The repo now has a real application backbone for the payout workflow, even though some execution/auth/test gaps still prevent calling it production-ready.

## 7. What appears unfinished

### Confirmed
- No session-based authentication flow is implemented; `app/api/v1/auth/google` and `lib/auth/smart-account.ts` provide a Google sign-in + deterministic smart-account address derivation surface without server-side sessions or middleware protection.
- Mutation routes now have a request-derived actor boundary for the seeded workspace roles:
  - payout create
  - payout activate
  - payout draft edit
  - milestone submit
  - milestone approve/reject
  - milestone release
  - release proof refresh
  - release retry
- Core UI surfaces now mask actions by actor role and include a header actor switcher for seeded-role testing.
- No E2E/browser integration test suite exists; unit coverage is limited to payload validation and repository logic.
- Arc execution is not verified here as a production-safe live payment path; behavior still depends on execution mode.
- Legacy mock-data files remain in the repository and may still represent transition-era coupling or fallback assumptions.

### Assumption
- Additional hardening is still needed around auth, validation depth, production release execution, and failure-path testing.

## 8. Documentation state

### Confirmed
- Technical docs exist in English for README, canonical docs, workflow/domain/API planning docs, DB schema planning, and checkpoint materials.
- Some documentation files were stale after the backend/data wedge and the merged theme refactor, and required refresh against current repository state.
- Archived docs still preserve earlier progress phases under `docs/archive/`.

## 9. Unknowns that require further inspection

- Whether all route handlers return a fully standardized error contract.
- Whether all release/retry/proof-refresh flows have been manually verified end-to-end against the seeded database.
- Whether the real Arc execution path is fully aligned with official Arc requirements for production release handling.
- Whether remaining stale checkpoint/supporting docs still need rationalization.


## 10. Confidence statement

### High confidence
- Route structure
- dependency/tooling setup
- presence of database/API/repository layers
- absence of a real session-based auth/session model (only a Google sign-in scaffold + smart-account derivation)
- presence of a narrow unit test layer (`lib/api` + `lib/repositories`) with no E2E coverage yet
- mode-aware Arc send architecture

### Medium confidence
- interpretation that the repo is now beyond frontend-only demo stage
- interpretation that some mock-era files remain for transitional/demo reasons

### Lower confidence / requires more inspection
- production readiness of release execution
- full consistency of all edge-case flows across UI, API, and persistence
- broader deployment/ops story outside the inspected repository surface
