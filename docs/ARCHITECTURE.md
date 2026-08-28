# ARCHITECTURE

> **TL;DR** — Next.js (App Router) full-stack MVP: Route Handlers (`app/api/v1/*`) → repositories → PostgreSQL/Prisma; `lib/arc/` is the Arc execution boundary (release-executor + onchain + browser-wallet). Auth/session is implemented (Phase 4); remaining work is Arc production hardening + broader test coverage. For live status and numbers, see `docs/CURRENT_STATE.md`.

## Overview
SettleFlow is currently structured as a Next.js application moving toward a real MVP architecture: typed domain models, repository/API-backed workflow mutations, database persistence, and an Arc execution boundary.

## Architecture Style
Current architecture is best described as:
- product-first MVP
- repository/API-driven for the core payout workflow
- persistence-backed with transitional legacy artifacts still present
- auth/session is implemented (Phase 4); remaining work is production hardening of Arc execution and broader test coverage

## Main Layers

### 1. Application / Route Layer
Located in `app/`.

Confirmed routes:
- `app/page.tsx`
- `app/dashboard/page.tsx`
- `app/payouts/new/page.tsx`
- `app/payouts/[id]/page.tsx`
- `app/layout.tsx`

Responsibilities:
- page composition
- route-level data loading and mutation entry points
- overall navigation and layout
- product workflow presentation

### 2. UI Component Layer
Located in `components/`.

Subareas:
- `components/shared/`
- `components/dashboard/`
- `components/milestones/`
- `components/payouts/`

Responsibilities:
- reusable buttons, cards, and empty states
- stat display
- milestone row rendering
- review controls
- release panel
- settlement proof display

### 3. Domain Model Layer
Located in `lib/models/`.

Confirmed models:
- `Contributor`
- `Payout`
- `Milestone`
- `TransactionProof`

Responsibilities:
- define core business entities
- define status enums / allowed states
- provide typed contracts for UI and future backend integration

### 4. Data Layer
Primary runtime data now flows through the database, repositories, and API routes. Legacy mock files still exist in `lib/data/` as transitional artifacts and should not be treated as the target architecture.

Confirmed primary runtime pieces:
- Prisma/database-backed repositories under `lib/repositories/`
- route handlers under `app/api/v1/`
- legacy mock files under `lib/data/` that still need cleanup or explicit dev-only positioning

Current behavior:
- core payout workflow supports persistence-backed reads and mutations
- route views increasingly derive content from repository-backed data
- some transitional/demo-era assumptions may still exist around seeded IDs, seeded roles, or mock/dev helper paths

### 5. Integration Layer
Located in `lib/arc/`.

Confirmed files:
- `config.ts`
- `types.ts`
- `onchain.ts`
- `release-executor.ts`
- `browser-wallet.ts`
- `map-send-result-to-proof.ts`

Responsibilities:
- Arc configuration
- typed send request / result shapes
- future settlement abstraction

Current limitation:
- `sendUsdcOnArc()` supports `circle_wallet` (real server-side EOA execution via viem) and `browser_wallet` (server-side failure — browser signs via wallet adapter). Production-safe live Arc execution against official requirements is not yet fully verified (requires a funded server key, gas fee strategy, and compliance review).

### 6. Utility Layer
Located in `lib/utils/`.

Confirmed helpers:
- `formatUsdc()`
- `shortenAddress()`

## Release Execution Model

SettleFlow supports two mutually exclusive execution modes for an approved release:

- `browser_wallet`: a connected operator wallet signs and submits the transaction in the browser.
- `circle_wallet`: a server-side Circle Wallets integration signs and submits the transaction through a protected backend boundary.

Both modes share the same release workflow, state machine, and transaction proof model. They differ only in who controls signing and where transaction credentials are held. The UI and domain service must not implement separate payout state machines for the two modes.

The release service selects an execution adapter from the release configuration:

```text
approve milestone
  -> create queued release
  -> select browser_wallet or circle_wallet adapter
  -> submit USDC transfer on Arc
  -> reconcile transaction result
  -> persist transaction proof and activity log
```

Security boundaries:

- Browser wallet calls are client-initiated and require explicit user confirmation.
- Circle Wallets calls are server-only; credentials must never use `NEXT_PUBLIC_*` variables.
- A release is not confirmed merely because a send request was accepted; confirmation must be reconciled and persisted.
- Both adapters must use string/decimal money values and idempotent release handling.

## Route Responsibilities

### `/`
Purpose:
- product framing
- workflow summary
- operator entry point into the payout workflow

### `/dashboard`
Purpose:
- payout operations overview
- review queue visibility
- payout and proof summaries

### `/payouts/new`
Purpose:
- draft/create payout agreement flow
- define contributor, amount, and milestone structure

### `/payouts/[id]`
Purpose:
- view payout details
- inspect milestone states
- review / release / proof surfaces

## State Model

### Payout Status
Confirmed in code:
- `draft`
- `active`
- `partially_released`
- `completed`

### Milestone Status
Confirmed in code:
- `pending`
- `submitted`
- `approved`
- `released`
- `rejected`

### Transaction Proof Status
Confirmed in code:
- `pending`
- `confirmed`
- `failed`

## Data Flow
Current confirmed flow:
1. route or page triggers repository/API-backed reads and mutations
2. repositories coordinate payout, milestone, release, and proof state transitions against persistence
3. typed data flows into presentational components
4. components render status-specific UI blocks and mutation results

Current non-confirmed / incomplete flow:
- real auth/session-backed actor resolution is implemented (Phase 4) but route-level integration/E2E test coverage is still absent
- `circle_wallet` release execution is wired (Phase 6) but production hardening is pending
- some transitional seeded-role and seeded-workspace assumptions still remain

## Product Context Boundary

SettleFlow now contains a dedicated product-context runtime boundary for seeded-role operation and auth-shaped workflow control.

Confirmed behavior:
- request context is resolved from header -> cookie -> query -> default fallback
- proxy logic bridges context through request headers and cookie persistence
- core workflow mutation routes derive actor identity from request context instead of trusting client-supplied actor IDs in JSON bodies
- client UI surfaces mask controls by actor capability
- a global actor switcher exists to exercise owner/reviewer/contributor flows without a real auth provider

Current limitation:
- the seeded-context fallback still exists for local development and role switching, but real session-authenticated identity is now the primary actor resolution path (Phase 4); context integrity is backed by signed JWT session claims

## Configuration

### Environment
Confirmed public env usage:
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_ARC_CHAIN_ID`
- `NEXT_PUBLIC_ARC_RPC_URL`
- `NEXT_PUBLIC_ARC_EXPLORER_URL`
- `NEXT_PUBLIC_USDC_ADDRESS`

### Tooling
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- ESLint

## What Is Not Present in the Current Architecture
Completed in recent phases:
- real server-side session auth + middleware route protection (Phase 4, implemented)
- `circle_wallet` release execution with real transaction sending (Phase 6, implemented)

Still incomplete or not yet confirmed:
- production-safe live Arc release execution verification (server key custody, gas funding, fee strategy, and official Arc compliance)
- comprehensive automated test coverage (route-level integration and E2E)

## Architectural Risks
- seeded/demo-era assumptions may still leak into UI and mutation entry points
- actor resolution is now session-based (Phase 4), but the seeded fallback remains for local development — unclear if it can mask real auth gaps
- legacy mock files and wording can mislead future implementation decisions
- live Arc execution safety requirements may force adapter or workflow changes even after the Phase 6 wiring

## Recommended Next Architecture Step
Before expanding into new feature surfaces, prioritize:
- removing seeded/demo assumptions from existing payout flows
- replacing hardcoded actor/workspace values with real product boundaries
- tightening auth/permission scope
- validating the release execution policy and adapter boundary (`browser_wallet` vs `circle_wallet`) against official Arc constraints
