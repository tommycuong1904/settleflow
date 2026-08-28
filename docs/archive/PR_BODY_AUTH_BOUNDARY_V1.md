# PR_BODY_AUTH_BOUNDARY_V1

## Title
Auth boundary v1 and workflow hardening for seeded-role payout flows

## Summary
This PR introduces an auth-shaped boundary for SettleFlow's seeded-role MVP flows. Core workflow mutations now derive actor identity from request product context instead of client-supplied body actor IDs. The branch also adds centralized policy checks, UI capability masking, a global actor switcher for seeded-role testing, and context-first cleanup for payout draft updates.

This is not a full auth/session implementation yet, but it establishes a clearer owner/reviewer/contributor workflow boundary while preserving the current MVP testing model.

## What changed
- centralize product context resolution
- add request-derived context resolution
- bridge context through proxy headers and cookie-backed persistence
- add actor-based permission boundary for core workflow mutations
- centralize policy checks in `lib/runtime/product-policy.ts`
- make policy checks context-aware
- mask workflow controls by actor in the UI
- add a global actor switcher for seeded-role testing
- remove legacy actor user IDs from primary client payloads
- make draft payout updates context-first
- simplify draft editing actor inputs
- update project architecture/state docs

## Verified
- `npx tsc --noEmit`
- `npm run build`

## Limitations
- no real login/session provider yet
- no signed identity/session claims yet
- no auth middleware tied to authenticated principal yet
- no automated test coverage for the new boundary yet
- seeded-role/product-context assumptions still remain

## Scope note
This branch is broader than auth-boundary-only scope. In addition to the boundary work, it also carries nearby workflow-hardening improvements already present on the branch, including payout activity timeline work, payout detail enrichments, draft editing harness improvements, and proof/retry hardening.

## Merge checklist
- [ ] Re-read `docs/archive/MERGE_PREP_AUTH_BOUNDARY_V1.md`
- [ ] Confirm broad-scope branch merge is acceptable
- [ ] Confirm `AGENTS.md` and `.hermes/` stay out of merge
- [ ] Merge only after latest `npx tsc --noEmit` and `npm run build` remain green
