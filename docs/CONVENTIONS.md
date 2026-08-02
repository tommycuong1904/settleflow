# CONVENTIONS

## Purpose
This document records the current repository conventions that can be confirmed from the codebase and the current working process.

## Language Conventions

### Confirmed repository convention
- Code is written in English.
- UI copy in the product is currently written in English.
- Technical documentation in `docs/` should be written in English.

## Project Structure Conventions

### Routing
- Next.js App Router structure is used.
- Route files live under `app/`.
- Dynamic payout detail route uses `app/payouts/[id]/page.tsx`.

### Components
- Reusable UI components live under `components/`.
- Components are grouped by concern:
  - `shared`
  - `dashboard`
  - `milestones`
  - `payouts`

### Domain and Data
- Domain types live under `lib/models/`.
- Mock/demo data lives under `lib/data/`.
- Integration helpers live under `lib/arc/`.
- utility helpers live under `lib/utils/`.

## TypeScript Conventions

### Confirmed
- TypeScript strict mode is enabled.
- Path alias `@/*` is configured.
- Domain types are explicitly named and reused across the app.

## Styling Conventions

### Confirmed
- Tailwind CSS v4 is used.
- Styling is primarily utility-class based.
- Shared visual shells/cards are reused across routes.

## UI / Product Conventions

### Confirmed
- Product language centers around:
  - payouts
  - milestones
  - review
  - approval
  - release
  - settlement proof
- The current app is designed around an approval-gated payout flow.

### Assumption
- New features should preserve the product story: milestone-based payout control on Arc with USDC and visible proof.

## Data Conventions

### Confirmed
- Current runtime data is mock data.
- Route-level pages derive metrics and selected entities directly from mock arrays.
- Transaction proof is represented as a first-class domain concept.

## Documentation Conventions

### Confirmed
- Technical markdown docs exist under `docs/`.
- Product, architecture, checkpoint, and planning docs are all stored there.

### Recommended convention for future consistency
- canonical product docs should be uppercase or clearly named if intended as primary reference docs
- checkpoint-specific drafts should stay separate from canonical architecture/state docs

## Repository Hygiene Conventions

### Confirmed
- `.next/`, `node_modules/`, env files, and `local-artifacts/` are ignored in `.gitignore`.
- Local-only artifacts are expected to live under `local-artifacts/`.

## Verification Conventions

### Confirmed
- Build script exists: `npm run build`
- Lint script exists: `npm run lint`

### Confirmed missing
- No automated test convention is currently established in source.

## Current Practical Constraints

### Confirmed
- The app currently behaves like a checkpoint/demo repository, not a production-integrated system.
- UI may imply richer functionality than the current implementation actually provides.

## Suggested Working Convention Going Forward
These are not yet confirmed as codebase-enforced rules, but they are the safest conventions to follow next:
- keep domain types separate from mock data
- keep docs that describe current facts separate from roadmap/aspiration docs
- distinguish demo scaffolding from production logic explicitly
- avoid introducing backend assumptions directly into presentational components
