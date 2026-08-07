# KNOWN_ISSUES

## Purpose
This document lists issues, gaps, inconsistencies, and inspection risks visible from the current repository state.

## Fact vs Assumption Legend
- **Confirmed**: directly verified from files or command output.
- **Assumption**: inferred but not fully proven.
- **Unknown**: requires further inspection.

## Confirmed Issues and Gaps

### 1. No real backend or persistence
- No database schema was found.
- No server API routes were found.
- No persistent create/update/release flow was found.
- All application state is currently driven by mock data in `lib/data/`.

### 2. Arc settlement integration is still placeholder-level
- `lib/arc/send.ts` returns a hard-coded pending response.
- No wallet connection or transaction execution implementation was found.
- No proof ingestion/update mechanism was found.
- The planned execution boundary includes two adapters: `browser_wallet` and `circle_wallet`.
- Neither adapter is wired yet; Circle Wallets credentials and server-side execution remain future backend work.

### 3. No authentication or access control
- No login flow, session handling, auth provider config, or middleware protection was found.
- All inspected routes appear public at the application layer.

### 4. No automated tests
- No unit, integration, or end-to-end test files were found using common naming patterns.
- The repository currently relies on build success and manual inspection more than automated verification.

### 5. Stale internal progress docs preserved for historical reference
- `docs/archive/project-status.md` still says the project is focused on Phase 3 / planning for Phases 4 and 5.
- `docs/archive/workboard.md` still reflects earlier in-progress state.
- These files are now archived, which reduces confusion, but they still should not be treated as current source-of-truth docs.

### 6. Potentially misleading payout detail fallback behavior
- `app/payouts/[id]/page.tsx` falls back to the first payout if the requested ID is not found.
- This can hide invalid route handling issues and make manual testing appear successful when the route is actually wrong.

### 7. Tooling inspection gap: LOC analysis skill unavailable without `pygount`
- The codebase-inspection skill was loaded.
- Attempting to run `pygount` failed because the command is not installed in the current environment.
- No installation was performed, per instruction.

## Confirmed Inconsistencies

### 1. Repo docs describe a more complete checkpoint narrative than the code actually implements
- README and architecture docs describe a coherent product and Arc integration path.
- The code confirms the UI architecture and product framing.
- The code does **not** confirm a real execution path for sending USDC, persistent review actions, or live proof generation.

### 2. Some product language suggests workflow readiness, but implementation remains demo-first
- Labels and UI text strongly imply operational review/release flow.
- The underlying behavior remains mock-driven.

## Assumptions / Likely Risks

### 1. Demo maturity may hide engineering immaturity
- **Assumption**: the polished UI may create the impression of a more complete backend/data system than actually exists.
- Risk is highest if someone assumes this repo is production-ready instead of checkpoint/demo-ready.

### 2. Future backend integration may require broad rewiring
- **Assumption**: replacing mock state with real APIs will affect most route-level components.
- The current code is presentation-friendly, but not obviously separated into client/server data boundaries yet.

### 3. Release and review actions may need state architecture redesign
- **Assumption**: once real writes are introduced, the current component flow may need stronger mutation/state handling, error states, optimistic UI, and server validation.

## Unknown Areas Requiring Further Inspection

### 1. Deployment story
- Unknown whether deployment scripts, container setup, or platform configuration exist outside the inspected surface.

### 2. CSS / design token completeness
- Unknown whether the full styling layer has hidden inconsistencies or TODOs without a deeper `globals.css` and component audit.

### 3. Hidden TODO/FIXME debt
- Unknown whether source files contain TODO/FIXME markers that were not exhaustively searched in this pass.

### 4. Branch / history divergence
- Unknown whether other branches contain abandoned or partially implemented backend/auth work.

## Highest-Risk Areas

### Confirmed high-risk
1. **Mock-data dependency across the entire product flow**
2. **Placeholder Arc send integration**
3. **No auth / no permissions model**
4. **No test coverage**
5. **Stale internal planning docs that can mislead future work**

## Safest Next Technical Investigation

### Recommended
- Inspect data flow boundaries in detail before implementing new behavior:
  - where mock data enters each route
  - which components are purely presentational
  - what mutations would be needed for create / approve / reject / release

### Why this is safest
- It does not require architecture rewrites yet.
- It reduces the chance of building features on wrong assumptions.
- It prepares the repository for backend/API work with lower risk.
