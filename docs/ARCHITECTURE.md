# ARCHITECTURE

## Overview
SettleFlow is currently structured as a frontend-first Next.js application with a typed domain model, mock data, and a small Arc integration scaffold.

## Architecture Style
Current architecture is best described as:
- presentation-first
- mock-data-driven
- checkpoint/demo oriented
- prepared for later backend and integration work

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
- route-level data selection from mock sources
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
Located in `lib/data/`.

Confirmed data sources:
- `mock-contributors.ts`
- `mock-payouts.ts`
- `mock-milestones.ts`
- `mock-transaction-proofs.ts`

Current behavior:
- application state is hard-coded
- route views derive their content directly from mock arrays
- no persistence or live mutation path is confirmed

### 5. Integration Layer
Located in `lib/arc/`.

Confirmed files:
- `config.ts`
- `types.ts`
- `send.ts`

Responsibilities:
- Arc configuration
- typed send request / result shapes
- future settlement abstraction

Current limitation:
- `sendUsdcOnArc()` is still a placeholder and does not execute real transactions

### 6. Utility Layer
Located in `lib/utils/`.

Confirmed helpers:
- `formatUsdc()`
- `shortenAddress()`

## Route Responsibilities

### `/`
Purpose:
- product framing
- workflow summary
- reviewer/demo entry point

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
1. route reads mock data from `lib/data/`
2. route derives view-specific metrics or selected entities
3. route passes typed data into presentational components
4. components render status-specific UI blocks

Current non-confirmed flow:
- no confirmed mutation pipeline
- no confirmed API round-trip
- no confirmed database read/write path

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
No confirmed implementation was found for:
- server API routes
- database layer
- ORM
- authentication provider
- authorization middleware
- automated test framework in source

## Architectural Risks
- mock data is embedded directly into route-level UI composition
- backend introduction will likely require data-access refactoring
- mutation flows are not yet architected end-to-end
- some route behavior is demo-friendly rather than production-safe

## Recommended Next Architecture Step
Before implementing new product behavior, define:
- data boundaries
- mutation boundaries
- API contract shapes
- persistent storage model
- auth/permission scope
