# ARCHITECTURE

Status: current
SSoT: Current repository implementation and runtime structure
Last verified: 2026-08

> Current implementation architecture. Live status and readiness claims belong in `docs/CURRENT_STATE.md`.

## Overview

SettleFlow is a Next.js App Router application. Its primary workflow is served by route pages and API handlers, backed by repository modules and PostgreSQL through Prisma. Arc integration is isolated behind `lib/arc/` execution boundaries.

## Repository structure

- `app/(marketing)/` — marketing and landing routes.
- `app/(app)/` — product routes: dashboard, payouts, contributors, activity, settings, and app entry.
- `app/api/v1/` — versioned handlers for auth, payouts, contributors, milestones, releases, settings, webhooks, dashboard, and feedback.
- `app/api/` — legacy/compatibility handlers that remain present alongside the versioned API.
- `components/` — reusable presentation and workflow components.
- `lib/repositories/` — Prisma-backed data access and workflow transitions.
- `lib/api/` — request payload and error utilities.
- `lib/auth/` — session, identity mapping, OAuth/wallet auth, and smart-account helpers.
- `lib/runtime/` — product context and policy logic.
- `lib/arc/` — Arc configuration, wallet integration, onchain helpers, and release execution.
- `prisma/` — schema, migrations, and seed configuration.
- `lib/data/` — legacy mock-data artifacts; not the primary persistence path.

## User-facing routes

The actual page files are:

- `app/(marketing)/page.tsx` — `/`.
- `app/(app)/dashboard/page.tsx` — `/dashboard`.
- `app/(app)/payouts/page.tsx` — `/payouts`.
- `app/(app)/payouts/new/page.tsx` — `/payouts/new`.
- `app/(app)/payouts/[id]/page.tsx` — `/payouts/[id]`.
- `app/(app)/contributors/page.tsx` — `/contributors`.
- `app/(app)/activity/page.tsx` — `/activity`.
- `app/(app)/settings/page.tsx` — `/settings`.
- `app/(app)/app/page.tsx` — `/app`.

The `(marketing)` and `(app)` directories are route groups and are not included in public URLs.

## Request and authentication flow

`proxy.ts` is the request boundary. For `POST`, `PUT`, `PATCH`, and `DELETE` requests under `/api/`, it verifies the `sf_session` cookie and returns `401 AUTH_REQUIRED` unless the path is an open auth endpoint or explicitly public feedback. It also bridges product-context headers, cookies, and query values.

`lib/auth/session.ts` creates and verifies signed, expiring session tokens. Session-aware handlers use `lib/auth/session-server.ts` to verify the session, load the user and first workspace membership, and build product context through `lib/auth/session-mapping.ts`.

## Authorization and product context

`lib/runtime/product-context.ts` defines runtime actors and context. `lib/auth/session-mapping.ts` maps stored membership roles to actors. `lib/runtime/product-policy.ts` enforces operation-specific permissions and actor/user alignment. `lib/runtime/role-utils.ts` provides hierarchy helpers.

Detailed permissions and workspace rules are owned by `docs/AUTHORIZATION.md`; security guarantees and limitations are owned by `docs/SECURITY_INVARIANTS.md`.

## API and data flow

```text
Next.js page or client action
  -> app/api/v1 route handler
  -> session/context and policy checks
  -> lib/repositories operation
  -> Prisma client
  -> PostgreSQL
```

Repositories enforce resource/workspace relationships where required. `prisma/schema.prisma` and migrations are authoritative for persisted entities, relations, and status enums.

## Workflow and state

Workflow transitions are coordinated by repository modules including `payout-creation.ts`, `payout-activation.ts`, `milestone-submission.ts`, `milestone-review.ts`, `milestone-release.ts`, `release-proof.ts`, and `release-retry.ts`.

## Arc and wallet boundaries

`lib/arc/` contains Arc configuration, browser-wallet integration, onchain helpers, and the release executor:

- `browser_wallet` — signing is performed by a connected browser wallet; the server executor fails explicitly for this mode.
- `circle_wallet` — the server derives an account from server-only `ARC_SERVER_PRIVATE_KEY` and sends the configured USDC transfer.

Release proof and source-wallet information are persisted through release/proof repositories. Production custody, funding, gas, compliance, and operational readiness are not asserted here; see `docs/CURRENT_STATE.md` and `docs/SECURITY_INVARIANTS.md`.

## Configuration

Public Arc/network values are read by `lib/arc/config.ts` from `NEXT_PUBLIC_*` variables with defaults. The server signing key is read by `lib/arc/release-executor.ts` from `ARC_SERVER_PRIVATE_KEY` and is not a public configuration value.

## Implemented versus planned

Implemented components include the route groups, versioned API handlers, session gate and session-aware context resolution, Prisma persistence, repository workflow operations, and mode-aware Arc release execution. Production hardening, comprehensive route/E2E coverage, and future escrow, multi-chain, or advanced approval components are not represented as implemented here.

## Verification sources

Checked against `app/(marketing)/**`, `app/(app)/**`, `app/api/**`, `proxy.ts`, `lib/auth/**`, `lib/runtime/**`, `lib/repositories/**`, `lib/arc/**`, `prisma/schema.prisma`, and `prisma/migrations/**`.
