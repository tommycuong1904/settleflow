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
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard/page.tsx
│   └── payouts/
│       ├── new/page.tsx
│       └── [id]/page.tsx
├── components/
│   ├── dashboard/
│   ├── milestones/
│   ├── payouts/
│   └── shared/
├── docs/
├── lib/
│   ├── arc/
│   ├── data/
│   ├── models/
│   └── utils/
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
  - Loads Google Geist fonts.
  - Sets metadata title/description.
  - Renders a shared header with links to `/dashboard` and `/payouts/new`.
  - Wraps all route content inside a shared main container.

### `app/page.tsx`
- **Confirmed**:
  - Landing page.
  - Presents product narrative, workflow steps, reviewer-facing proof messaging, and CTAs.
- **Assumption**:
  - Intended as the main marketing / demo entry point for reviewers.

### `app/dashboard/page.tsx`
- **Confirmed**:
  - Dashboard view for payout operations.
  - Uses mock payout, milestone, contributor, and proof data.
  - Surfaces review queue, ready-to-release value, released-with-proof value, active payouts, and recent settlement proof.

### `app/payouts/new/page.tsx`
- **Confirmed**:
  - Create Payout UI.
  - Contains form-like inputs for title, contributor, wallet, and amount.
  - Shows milestone structure, approval logic, settlement preview, and release/proof flow.
- **Assumption**:
  - Intended to become a real payout creation form later.

### `app/payouts/[id]/page.tsx`
- **Confirmed**:
  - Dynamic payout detail route.
  - Reads `params.id`, finds a payout from mock data, and falls back to the first payout if no match is found.
  - Shows payout summary, milestone workflow, release target, settlement proof, and workflow explanation.
- **Risk note**:
  - The fallback behavior can hide invalid IDs instead of failing loudly.

## Component Map

### `components/shared/`
- **Confirmed**:
  - `button.tsx`: reusable button/link wrapper with `primary`, `secondary`, `ghost` variants.
  - `section-card.tsx`: shared section container.
  - `empty-state.tsx`: shared empty-state block.

### `components/dashboard/`
- **Confirmed**:
  - `stat-card.tsx`: reusable dashboard metric display.

### `components/milestones/`
- **Confirmed**:
  - `milestone-row.tsx`: milestone card that conditionally renders review controls, release panel, or passive status messaging.
  - `milestone-status-badge.tsx`: milestone status badge.
  - `review-controls.tsx`: approve/reject control block with helper copy.

### `components/payouts/`
- **Confirmed**:
  - `release-panel.tsx`: release action surface for approved milestones.
  - `transaction-proof-card.tsx`: transaction proof UI with status, network, tx hash, and explorer link.

## Library Structure

### `lib/models/`
- **Confirmed**:
  - `contributor.ts`
  - `payout.ts`
  - `milestone.ts`
  - `transaction-proof.ts`
- **Confirmed**:
  - These files define the main domain types used by the UI.

### `lib/data/`
- **Confirmed**:
  - `mock-contributors.ts`
  - `mock-payouts.ts`
  - `mock-milestones.ts`
  - `mock-transaction-proofs.ts`
- **Confirmed**:
  - Current application state is driven by hard-coded mock arrays.

### `lib/arc/`
- **Confirmed**:
  - `config.ts`: Arc chain/rpc/explorer/USDC config from `NEXT_PUBLIC_*` env vars with defaults.
  - `types.ts`: send request/result types.
  - `send.ts`: placeholder `sendUsdcOnArc()` function returning a mocked pending response.
- **Assumption**:
  - This is scaffolding for future Arc/App Kit Send integration, not a real onchain implementation yet.

### `lib/utils/`
- **Confirmed**:
  - `format.ts` contains `formatUsdc()` and `shortenAddress()` helpers.

## Docs Structure

### Confirmed
- `README.md`
- `docs/README.md`
- `docs/PROJECT.md`
- `docs/ARCHITECTURE.md`
- `docs/CONVENTIONS.md`
- `docs/CURRENT_STATE.md`
- `docs/PROJECT_MAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/mvp-scope.md`
- `docs/checkpoint-2-demo-flow.md`
- `docs/checkpoint-2-deck-outline.md`
- `docs/checkpoint-2-submission-draft.md`
- `docs/progress-summary-checkpoint-2.md`
- `docs/archive/architecture.md`
- `docs/archive/project-status.md`
- `docs/archive/workboard.md`
- `docs/screenshots/*.png`

### Assumption
- The docs are now organized into canonical, supporting, and archived/legacy groups.

## Configuration and Tooling

### Confirmed
- `package.json`
  - scripts: `dev`, `build`, `start`, `lint`
  - runtime deps: `next`, `react`, `react-dom`
  - dev deps: TypeScript, ESLint, Tailwind v4, Next ESLint config
- `tsconfig.json`
  - strict mode enabled
  - path alias `@/*`
- `next.config.ts`
  - Turbopack root configured
- `postcss.config.mjs`
  - Tailwind PostCSS plugin enabled
- `eslint.config.mjs`
  - uses Next core-web-vitals + TypeScript presets
- `.gitignore`
  - ignores `.next`, `node_modules`, env files, coverage, and `local-artifacts/`

## Runtime / Generated Directories

### Confirmed
- `.next/` exists in the repository working tree.
- `node_modules/` exists in the repository working tree.
- `local-artifacts/` exists and is intentionally ignored.

### Unknown
- Whether `.deckenv/` is intentionally part of the project workflow or a local auxiliary environment; it was visible in repository search noise but not part of the inspected application structure.

## Missing Areas

### Confirmed missing from inspected repository
- No `app/api/` routes.
- No `route.ts` files under `app/`.
- No `middleware.ts`.
- No explicit auth provider config.
- No database schema or ORM config inspected.
- No test files matching common `*.test.*` / `*.spec.*` patterns.

## Inspection Limits

### Unknown
- Full CSS system details were not exhaustively mapped in this pass.
- No backend services or external integrations were found beyond Arc scaffolding, but hidden future plans may exist in uninspected docs or branches.
- No package installation was performed, so tool availability was not expanded beyond what is already present.
