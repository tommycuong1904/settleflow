# KNOWN_ISSUES

## Purpose
This document lists issues, gaps, inconsistencies, and inspection risks visible from the current repository state.

## Fact vs Assumption Legend
- **Confirmed**: directly verified from files or command output.
- **Assumption**: inferred but not fully proven.
- **Unknown**: requires further inspection.

## Confirmed Issues and Gaps

### 1. No full authentication system
- No server-side session handling, auth provider config, or middleware protection was found; the Google sign-in route (`app/api/v1/auth/google`) exists but issues no session/cookie.
- Search did not find `nextauth`, `clerk`, `getServerSession`, or middleware-based route protection.
- The application surface is still public at the HTTP layer.
- A Google sign-in surface exists (`app/api/v1/auth/google` + `lib/auth/smart-account.ts`) that derives a deterministic smart-account address, but it issues no session/cookie and routes remain unprotected.
- Core mutation routes now have a minimal repository-backed permission boundary for seeded workspace roles, but this is not a full auth/session model.

### 2. Automated test coverage is narrow
- The repository now contains 16 unit test files under `lib/api/*.test.mts` and `lib/repositories/*.test.mts`; `npm test` runs `node --import tsx --test "lib/**/*.test.mts"`.
- Coverage is limited to payload validation and repository logic; there are no route-level integration tests and no E2E/browser test suite.

### 3. Arc release execution is not yet proven production-safe
- `lib/arc/send.ts` now supports `mock`, `demo`, and `real` execution modes.
- The existence of a real-mode adapter boundary is confirmed.
- This inspection did **not** verify a production-safe end-to-end live release path against official Arc execution requirements.
- `sendUsdcOnArc()` still returns synthetic results in `mock` and `demo` modes.

### 4. Legacy mock-data artifacts remain in the repository
- `lib/data/` still contains:
  - `mock-contributors.ts`
  - `mock-payouts.ts`
  - `mock-milestones.ts`
  - `mock-transaction-proofs.ts`
- The repository is no longer accurately described as mock-only, but these files can still create confusion about the true source of data.

### 5. Documentation drift risk after recent wedges
- `docs/CURRENT_STATE.md`, `docs/KNOWN_ISSUES.md`, and `docs/PROJECT_MAP.md` had become stale relative to the repository state (backend/data wedge, then the merged theme refactor, contributor management, activity CSV export, and webhook scaffolding).
- This creates a risk that future work is planned from outdated assumptions unless canonical docs are kept in sync with code.

### 6. Potential route-map/documentation drift in supporting docs
- Some supporting/checkpoint docs may still reflect earlier frontend-first assumptions or pre-backend wording.
- They were not all fully re-audited in this pass.

### 7. Webhook dispatcher reads URL from env var, not from Settings UI
- The dispatcher is wired into `lib/repositories/milestone-submission.ts`, `milestone-review.ts`, and `milestone-release.ts` for `milestone_submitted`, `milestone_approved`/`milestone_rejected`, and `milestone_released` events.
- The URL source is `process.env.SETTLEFLOW_WEBHOOK_URL` (or `NEXT_PUBLIC_SETTLEFLOW_WEBHOOK_URL`); the Settings UI webhook input only supports the "Test Webhook" action but does not persist the URL to the dispatcher's env source.

## Confirmed Inconsistencies

### 1. Canonical docs previously described the app as having no backend/API/database
- The repository now contains:
  - Prisma schema and migration history
  - a PostgreSQL datasource
  - repository modules under `lib/repositories/`
  - API routes under `app/api/` and `app/api/v1/`
- Any doc claiming there is no backend, no API, or no DB layer is now inaccurate.

### 2. Project structure docs previously described only shallow frontend routes and libraries
- The repository now includes additional route handlers, DB client code, repository modules, and Arc execution helpers that were absent from older structure docs.

## Assumptions / Likely Risks

### 1. Transitional architecture may still hide mock-era coupling
- **Assumption**: some UI or helper flows may still carry assumptions from the earlier mock-data phase even though the primary architecture now includes persistence and API routes.

### 2. Release/retry/proof flows may still need broader failure-path verification
- **Assumption**: once live execution becomes important, retry semantics, proof refresh behavior, and release state transitions will need deeper adversarial/manual validation.

### 3. Public application surface still carries risk despite minimal permissions
- **Assumption**: the current seeded-role permission checks reduce obvious mutation risk, but the lack of a real auth/session boundary will become more serious as backend capabilities expand.

## Unknown Areas Requiring Further Inspection

### 1. Authorization model
- Unknown which actor roles should eventually be enforced at the route or workspace layer.

### 2. Production Arc requirements
- Unknown whether the current real-mode executor is fully sufficient under official Arc documentation and deployment constraints.

### 3. Error-contract consistency
- Unknown whether all route handlers expose consistent status codes and response shapes across success/failure paths.

### 4. Data migration / reseeding workflow
- Unknown whether the current migration + seed workflow is stable enough for repeated developer resets across environments.

## Highest-Risk Areas

### Confirmed high-risk
1. **No full auth/session model**
2. **Narrow automated test coverage (no route/E2E layer)**
3. **Production readiness of Arc release execution remains unverified**
4. **Stale supporting docs can mislead future work**
5. **Mock-era artifacts may blur architecture understanding**

## Safest Next Technical Investigation

### Recommended
- Audit route-by-route consistency across:
  - repository reads/writes
  - allowed state transitions
  - error responses
  - release/retry/proof-refresh flows
- Finish contributor edit/archive (PATCH/DELETE + UI) and allow webhook URL to be configured from Settings UI instead of only env var.
- Then define the smallest real auth/session boundary before broader feature expansion.

### Why this is safest
- It builds on the new persistence/API backbone without broad rewrites.
- It reduces the risk of compounding undocumented backend behavior.
- It keeps future Arc integration aligned with explicit state and permission boundaries.
