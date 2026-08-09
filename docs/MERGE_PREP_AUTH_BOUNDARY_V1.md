# MERGE_PREP_AUTH_BOUNDARY_V1

## Branch
- `feat/auth-boundary-v1`

## Recommended merge framing
This branch is best described as an **auth-boundary and workflow-hardening wedge**, not as a pure auth-only branch.

It includes:
- seeded-role product context infrastructure
- route-level actor boundary hardening
- UI capability masking
- actor switcher UX for seeded-role testing
- request-derived identity cleanup
- draft editing cleanup and context-first alignment
- workflow hardening already present on this branch, including activity timeline and richer payout detail behavior

## What this branch changes

### 1. Product context boundary
- centralizes product context resolution
- adds request-derived context resolution
- bridges context through proxy headers
- adds cookie-backed context persistence
- makes core workflow routes resolve actor identity from request context instead of body actor IDs

### 2. Permission boundary
- adds actor-based permission boundary for core workflow mutations
- centralizes policy checks in `lib/runtime/product-policy.ts`
- upgrades policy checks to use `productContext`, not actor string only

### 3. UI alignment
- masks owner / reviewer / contributor actions in the UI
- adds a global actor switcher in the header for seeded-role flow testing
- removes legacy actor user IDs from primary client mutation payloads

### 4. Draft editing cleanup
- makes draft payout updates context-first
- removes legacy actor aliases from draft editing repository inputs
- narrows draft update payloads to business fields only

### 5. Documentation
- updates `docs/CURRENT_STATE.md`
- updates `docs/ARCHITECTURE.md`
- updates `docs/PROJECT.md`
- documents the current auth-boundary-v1 shape and limitations

## Verified on this branch
Confirmed during execution:
- `npx tsc --noEmit` passes
- `npm run build` passes

## Important limitations
This is **not** a full auth system yet.

Still missing:
- real login/session provider
- signed identity or tamper-resistant session claims
- authorization middleware tied to authenticated principal
- production-grade permission model beyond seeded-role context
- automated test coverage for the new boundary

## Merge caution
This branch is broader than auth-boundary-only scope.

Compared with `main`, it also contains nearby workflow/product wedges such as:
- payout activity timeline work
- payout detail enrichments
- draft editing harness improvements
- proof/retry hardening
- local actor override groundwork

If the goal is to merge a broader MVP-hardening slice, this branch is mergeable.
If the goal is to merge a narrowly scoped auth-only PR, this branch should be split first.

## Suggested PR title
- `Auth boundary v1 and workflow hardening for seeded-role payout flows`

## Suggested PR summary
This PR introduces an auth-shaped boundary for SettleFlow's seeded-role MVP flows. Core workflow mutations now derive actor identity from request product context instead of client-supplied body actor IDs. The branch also adds centralized policy checks, UI capability masking, a global actor switcher for seeded-role testing, and context-first cleanup for payout draft updates. It is not a full auth/session implementation yet, but it establishes a clearer boundary for owner/reviewer/contributor workflow control while preserving the current MVP testing model.
