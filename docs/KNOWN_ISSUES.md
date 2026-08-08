# KNOWN_ISSUES

## Purpose
This document lists issues, gaps, inconsistencies, and inspection risks visible from the current repository state.

## Fact vs Assumption Legend
- **Confirmed**: directly verified from files or command output.
- **Assumption**: inferred but not fully proven.
- **Unknown**: requires further inspection.

## Confirmed Issues and Gaps

### 1. No full authentication system
- No login flow, session handling, auth provider config, or middleware protection was found.
- Search did not find `nextauth`, `clerk`, `getServerSession`, or middleware-based route protection.
- The application surface is still public at the HTTP layer.
- Core mutation routes now have a minimal repository-backed permission boundary for seeded workspace roles, but this is not a full auth/session model.

### 2. No automated tests
- No unit, integration, or end-to-end test files were found using common naming patterns.
- The repository currently relies on build/typecheck/manual verification more than automated test coverage.

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

### 5. Documentation drift risk after the backend/data wedge
- `docs/CURRENT_STATE.md`, `docs/KNOWN_ISSUES.md`, and `docs/PROJECT_MAP.md` had become stale relative to the repository state.
- This creates a risk that future work is planned from outdated assumptions unless canonical docs are kept in sync with code.

### 6. Potential route-map/documentation drift in supporting docs
- Some supporting/checkpoint docs may still reflect earlier frontend-first assumptions or pre-backend wording.
- They were not all fully re-audited in this pass.

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
2. **No automated test coverage**
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
- Then define the smallest auth boundary before broader feature expansion.

### Why this is safest
- It builds on the new persistence/API backbone without broad rewrites.
- It reduces the risk of compounding undocumented backend behavior.
- It keeps future Arc integration aligned with explicit state and permission boundaries.
