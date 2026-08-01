# CURRENT_STATE

## Summary
This repository is currently a frontend-first Next.js demo application for SettleFlow, an Arc-native milestone-based USDC payout workflow for crypto teams.

## Fact vs Assumption Legend
- **Confirmed**: directly verified from repository files or command output.
- **Assumption**: inferred from repository structure, copy, or naming.
- **Unknown**: not verifiable from the current inspection.

## 1. How the project currently works

### Confirmed
- The app is built with **Next.js 16**, **React 19**, and **TypeScript**.
- The main user-visible routes are:
  - `/`
  - `/dashboard`
  - `/payouts/new`
  - `/payouts/[id]`
- The app currently works as a **UI/demo layer backed by mock data**, not a live backend.
- Core data is loaded from hard-coded files in `lib/data/`.
- Domain types are defined in `lib/models/`.
- Arc configuration is read from `NEXT_PUBLIC_*` env vars with defaults.
- The payout send function `sendUsdcOnArc()` currently returns a placeholder pending response and does not perform a real transaction.
- `npm run build` is available and has been used successfully during earlier verified work in this repository.

### Assumption
- The app is meant to demonstrate product logic and user flow first, then grow into a real payout system with live settlement integration later.

## 2. Current feature surface

### Landing (`/`)
#### Confirmed
- Explains the product proposition.
- Frames the workflow around milestone definition, review, approval, release, and proof.
- Includes CTAs to launch the demo and view the dashboard.

### Dashboard (`/dashboard`)
#### Confirmed
- Shows high-level payout operations metrics.
- Surfaces milestones waiting for review.
- Shows active payouts and recent settlement proof.
- Reads all state from mock data arrays.

### Create Payout (`/payouts/new`)
#### Confirmed
- Presents a form-like payout agreement builder.
- Includes fields for payout title, contributor, wallet address, total amount, milestone structure, and release/proof framing.
- Uses static defaults and mock contributors.

### Payout Detail (`/payouts/[id]`)
#### Confirmed
- Displays payout summary, milestone workflow, release target, and settlement proof.
- Renders milestone-specific UI states:
  - pending
  - submitted
  - approved
  - released
- Uses review and release UI components, but they are not wired to persistent mutations.

## 3. Data, database, and API state

### Confirmed facts
- There is **no inspected database layer**.
- No Prisma schema, Drizzle schema, SQL migrations, or similar database artifacts were found in the inspected application structure.
- There are **no inspected API routes** under `app/api/`.
- There are **no `route.ts` files** in the app routes that would expose server endpoints.
- Application state is driven by:
  - `mock-contributors.ts`
  - `mock-payouts.ts`
  - `mock-milestones.ts`
  - `mock-transaction-proofs.ts`

### Assumptions
- The repository is still in a pre-backend checkpoint/demo stage.
- Database and API work likely remain future implementation steps rather than removed code.

### Unknown
- Whether a backend exists in another repository or planned private service.

## 4. Authentication state

### Confirmed facts
- Search did not find auth-related flows such as `nextauth`, `clerk`, `supabase auth`, `login`, `signin`, or session handling in app code.
- No auth middleware or guarded route structure was found.

### Conclusion
- **No authentication flow is currently implemented in the inspected repository.**

### Unknown
- Whether auth is intentionally out of scope for the current checkpoint or simply not started yet.

## 5. Build, scripts, and tests

### Confirmed facts
- `package.json` defines:
  - `npm run dev`
  - `npm run build`
  - `npm run start`
  - `npm run lint`
- ESLint is configured via `eslint.config.mjs`.
- TypeScript strict mode is enabled in `tsconfig.json`.
- No explicit repository test files were found under common naming patterns.
- No Playwright/Jest/Vitest/Cypress test suites were found in application source.

### Notes
- `package-lock.json` references some transitive tooling noise, but there is no confirmed first-class test setup in the repository source itself.

## 6. What appears complete

### Confirmed
- Core route structure is present.
- Shared layout and navigation are implemented.
- Reusable UI component system exists for cards, buttons, statuses, proof display, and milestone controls.
- Mock domain model is coherent enough to drive the demo flow.
- Product framing docs and checkpoint docs exist.
- The Arc integration surface has a basic file structure and typed placeholder abstraction.

### Assumption
- The UI/UX demo layer is relatively mature compared with the missing backend/auth/data layers.

## 7. What appears unfinished

### Confirmed
- Real payout execution is unfinished: `sendUsdcOnArc()` is still a placeholder.
- Create payout is unfinished as a real workflow: inputs are present, but no persistence or submission path was found.
- Review/approve/reject/release actions are unfinished as live mutations.
- Settlement proof is currently driven by mock data.
- No backend API surface was found.
- No database layer was found.
- No authentication flow was found.
- No automated tests were found.

### Assumption
- The repository is intentionally optimized for checkpoint/demo readiness rather than production behavior.

## 8. Documentation state

### Confirmed
- Technical docs exist in English for README, architecture, MVP scope, and checkpoint materials.
- Internal planning docs also exist under `docs/`, but some of them are stale relative to current repository state.
- `docs/project-status.md` and `docs/workboard.md` still describe earlier progress phases rather than the fully completed 5-phase state now present in git history.

## 9. Unknowns that require further inspection

- How `app/globals.css` defines the design system in detail.
- Whether there are hidden TODO markers not covered in this pass.
- Whether `.deckenv/` is relevant to product workflows or only local artifact tooling.
- Whether any untracked local scripts outside the inspected app influence deployment or demo operations.
- Whether branch history contains abandoned backend/auth work.

## 10. Confidence statement

### High confidence
- Route structure
- dependency/tooling setup
- absence of backend/API/auth in the inspected source
- mock-data-driven architecture
- placeholder Arc send integration

### Medium confidence
- interpretation that the repo is checkpoint/demo-first by intention, not only by incompleteness

### Lower confidence / requires more inspection
- deployment workflow
- future backend integration plan beyond current docs
- whether hidden stale assets or support environments affect the real project lifecycle
