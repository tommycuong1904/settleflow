# PROJECT_MAP

## Purpose
This document maps the current repository structure and explains the role of each major area.

## Fact vs Assumption Legend
- **Confirmed**: directly verified from repository files.
- **Assumption**: inferred from naming, copy, or structure, but not fully implemented or verified by runtime logic.
- **Unknown**: not present in the inspected repository or requires deeper inspection.

## Top-Level Structure

### Confirmed
```text
settleflow/
├── app/
│   ├── api/
│   ├── dashboard/
│   ├── payouts/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── dashboard/
│   ├── milestones/
│   ├── payouts/
│   ├── shared/
│   └── ui/
├── docs/
├── lib/
│   ├── arc/
│   ├── data/
│   ├── db/
│   ├── models/
│   ├── repositories/
│   └── utils/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.js
├── public/
├── package.json
├── package-lock.json
├── tsconfig.json
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
├── .env.example
└── README.md
```

## App Routes

### `app/layout.tsx`
- **Confirmed**:
  - Defines the root HTML shell.
  - Loads Geist fonts.
  - Sets metadata title/description.
  - Renders shared layout chrome including header and footer.
  - Wraps all route content inside a shared main container.

### `app/page.tsx`
- **Confirmed**:
  - Landing page.
  - Presents product narrative, workflow steps, reviewer-facing proof messaging, and CTAs.
  - Includes the `#workflow` anchor for landing-page navigation.

### `app/dashboard/page.tsx`
- **Confirmed**:
  - Dashboard view for payout operations.
  - Represents the read-model surface for key payout metrics, review queue, and proof visibility.

### `app/payouts/new/page.tsx`
- **Confirmed**:
  - Create Payout UI.
  - Loads contributor options from an API route.
  - Submits payout creation through the v1 payout API.

### `app/payouts/[id]/page.tsx`
- **Confirmed**:
  - Dynamic payout detail route.
  - Displays payout summary, milestone workflow, release target, and settlement proof.
  - Integrates with submit/approve/reject/release behaviors through the API layer.

## API Route Map

### `app/api/`
- **Confirmed**:
  - `contributors/route.ts`
  - `dashboard/route.ts`
  - `payouts/route.ts`
  - `payouts/[id]/route.ts`
  - `release/route.ts`
- **Assumption**:
  - These paths exist as compatibility or simplified entry points alongside the versioned API surface.

### `app/api/v1/`
- **Confirmed**:
  - `contributors/route.ts`
  - `dashboard/route.ts`
  - `payouts/route.ts`
  - `payouts/[id]/route.ts`
  - `payouts/[id]/activate/route.ts`
  - `milestones/[id]/submit/route.ts`
  - `milestones/[id]/approve/route.ts`
  - `milestones/[id]/reject/route.ts`
  - `milestones/[id]/release/route.ts`
  - `releases/[id]/route.ts`
  - `releases/[id]/retry/route.ts`
  - `releases/[id]/proof/refresh/route.ts`
- **Confirmed**:
  - The repository now has an explicit server mutation/read surface rather than frontend-only state transitions.

## Component Map

### `components/shared/`
- **Confirmed**:
  - Shared layout and UI wrappers such as button, footer, section card, and empty-state building blocks.

### `components/dashboard/`
- **Confirmed**:
  - Dashboard-facing metric and summary components.

### `components/milestones/`
- **Confirmed**:
  - Milestone display and action components for status, review, and release flow presentation.

### `components/payouts/`
- **Confirmed**:
  - Payout-specific interaction surfaces such as the release panel and transaction proof card.

### `components/ui/`
- **Confirmed**:
  - Low-level reusable UI primitives exist in the repository now.

## Library Structure

### `lib/models/`
- **Confirmed**:
  - Domain model types for contributor, payout, milestone, and transaction proof remain part of the codebase.

### `lib/data/`
- **Confirmed**:
  - Legacy mock data files still exist.
- **Assumption**:
  - They are now transitional/demo-support artifacts rather than the sole runtime data source.

### `lib/db/`
- **Confirmed**:
  - `client.ts` provides the database client entry point.

### `lib/repositories/`
- **Confirmed**:
  - Repository modules now encapsulate server-side data access and workflow mutations:
    - `contributors.ts`
    - `dashboard.ts`
    - `milestone-release.ts`
    - `milestone-review.ts`
    - `milestone-submission.ts`
    - `payout-activation.ts`
    - `payout-creation.ts`
    - `payout-editing.ts`
    - `payouts.ts`
    - `release-proof.ts`
    - `release-retry.ts`
    - `releases.ts`

### `lib/arc/`
- **Confirmed**:
  - `config.ts`: Arc chain/rpc/explorer/USDC config from env vars with defaults.
  - `types.ts`: request/result types.
  - `send.ts`: mode-aware Arc send entry point.
  - `release-executor.ts`: release execution boundary.
  - `map-send-result-to-proof.ts`: maps send results into proof records/UI shape.
- **Assumption**:
  - This area is the official application boundary for Arc payout execution logic.

### `lib/utils/`
- **Confirmed**:
  - Formatting helpers remain in the repository.

## Prisma / Database Structure

### Confirmed
- `prisma/schema.prisma` defines the database schema.
- `prisma/migrations/` contains migration history.
- `prisma/seed.js` provides seed data bootstrapping.

## Docs Structure

### Confirmed
- Canonical docs:
  - `docs/PROJECT.md`
  - `docs/ARCHITECTURE.md`
  - `docs/CONVENTIONS.md`
  - `docs/CURRENT_STATE.md`
  - `docs/PROJECT_MAP.md`
  - `docs/KNOWN_ISSUES.md`
- Domain/planning docs:
  - `docs/DOMAIN_MODEL.md`
  - `docs/WORKFLOW_STATE_MACHINE.md`
  - `docs/API_PLAN.md`
  - `docs/DB_SCHEMA.md`
- Supporting docs:
  - `docs/mvp-scope.md`
  - checkpoint and submission materials
  - screenshots
- Archive docs:
  - `docs/archive/*`

## Configuration and Tooling

### Confirmed
- `package.json`
  - scripts: `dev`, `build`, `start`, `lint`
  - runtime deps include Next, React, Radix helpers, and UI utility packages
  - Prisma seed config exists
- `tsconfig.json`
  - strict mode enabled
  - path alias `@/*`
- `next.config.ts`
  - Next config present
- `postcss.config.mjs`
  - Tailwind PostCSS plugin enabled
- `eslint.config.mjs`
  - uses Next + TypeScript presets

## Runtime / Generated Directories

### Confirmed
- `.next/` exists in the repository working tree.
- `node_modules/` exists in the repository working tree.

## Missing Areas

### Confirmed missing from inspected repository
- No auth middleware or provider integration was found.
- No test files matching common `*.test.*` / `*.spec.*` patterns were found.

## Inspection Limits

### Unknown
- Full component-level coupling between legacy mock artifacts and repository-backed data flow was not exhaustively mapped in this pass.
- The production-readiness of the real Arc execution path was not verified here against live official Arc constraints.
- Supporting docs outside the canonical set were not fully rationalized in this pass.
