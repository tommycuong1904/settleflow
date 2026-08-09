# HANDOFF

## Current Product Checkpoint

SettleFlow is now a website-testable MVP for an Arc-native milestone-based USDC payout workflow.

The core product flow currently available in the repository is:
1. create a payout
2. edit draft payout details and milestones
3. activate payout
4. submit milestone work
5. approve or reject milestone completion
6. queue release after approval
7. refresh settlement proof to confirmed or failed
8. retry a failed release
9. inspect activity history throughout the flow

## What was completed in the latest execution wedge

### Workflow hardening
- draft payout editing now has a real in-app harness on payout detail
- draft updates refresh activity automatically
- draft update responses now return richer payloads so the client syncs closer to server truth
- payout activity refresh now also runs after non-draft workflow actions
- review, release, proof refresh, and retry mutations now return richer workflow data

### Runtime verification
Confirmed during the latest checkpoint:
- `npx tsc --noEmit` passes
- `npm run build` passes
- `GET /` returns `200`
- `GET /dashboard` returns `200`
- `GET /payouts/new` returns `200`
- `GET /payouts/[id]` returns `200`
- `GET /api/v1/dashboard` returns stats
- `GET /api/v1/contributors?status=active` returns active contributors
- `GET /api/v1/payouts` returns payout data
- `GET /api/v1/payouts/[id]?workspaceId=ws-demo` returns real payout detail data

## Product status

### Done enough for today’s MVP checkpoint
- landing, dashboard, create payout, and payout detail all exist and load
- persistence-backed payout workflow exists
- payout detail supports the main state transitions
- proof and retry surfaces exist
- activity timeline updates through the main workflow
- release execution remains mode-aware behind the Arc execution boundary

### Still not the same as production-ready
- auth/session is still missing
- actor/workspace resolution still relies on seeded/demo assumptions in places
- Arc live execution is not yet proven production-safe
- automated tests are still missing
- some mock/demo artifacts remain in the repository and docs

## Recommended next step
Before expanding feature scope further, prioritize one of these:
1. replace seeded actor/workspace assumptions with real auth/session boundaries
2. standardize mutation response contracts across all payout workflow routes
3. add at least one automated integration test slice for create → activate → review → release
