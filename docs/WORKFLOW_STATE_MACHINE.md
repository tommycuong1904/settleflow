# WORKFLOW_STATE_MACHINE

Status: current
SSoT: Current transition/update implementation
Last verified: 2026-08

## Purpose and scope

This document records state changes actually supported by the current implementation. It does not define a future ideal state machine. Authorization details are referenced from `docs/AUTHORIZATION.md`.

## Payout

States: `draft`, `active`, `partially_released`, `completed`.

### Supported transitions

- Creation creates a `draft` payout through `lib/repositories/payout-creation.ts` and `app/api/v1/payouts/route.ts`.
- `draft -> active` is performed by `activatePayout` after workspace/owner-role authorization, target-wallet presence, at least one milestone, and exact milestone-total validation (`lib/repositories/payout-activation.ts`).
- After release proof confirmation, `recalculatePayoutStatus` derives `active`, `partially_released`, or `completed` from milestone statuses (`lib/repositories/payout-status.ts`). All milestones released yields `completed` and `completedAt`; some released yields `partially_released`.

There is no separately verified pause, cancel, or formal transition table beyond these repository rules. A payout with no milestones is derived as `draft`.

## Milestone

States: `pending`, `submitted`, `approved`, `rejected`, `released`.

### Supported transitions

- `pending -> submitted` and `rejected -> submitted`: `submitMilestone` requires the same workspace, a valid contributor user, contributor/link or wallet match, and a submittable status. It creates a `MilestoneSubmission` and resets review/release timestamps (`lib/repositories/milestone-submission.ts`).
- `submitted -> approved`: `reviewMilestone(..., "approved")` requires a submitted milestone with a submission and an owner/ops/reviewer workspace role (`lib/repositories/milestone-review.ts`).
- `submitted -> rejected`: the same function requires a non-empty rejection comment and records a rejected review.
- `approved -> released`: `refreshReleaseProof` sets the milestone to `released` only when confirmation is recorded for an approved milestone (`lib/repositories/release-proof.ts`).

No direct transition to `released` is supported by the queue operation. Release queuing requires `approved` first.

## Release and proof

### Release states

`ReleaseStatus` values are `queued`, `pending`, `confirmed`, `failed`, and `cancelled`.

`queueMilestoneRelease` creates `queued` release and `pending` proof records only when the milestone is approved, the payout is `active` or `partially_released`, no release already exists, the destination exists, and the requested amount equals the milestone amount. It requires owner/ops workspace authorization (`lib/repositories/milestone-release.ts`).

The executor may move execution through its mode-specific send path. `refreshReleaseProof` supports `queued`/`pending` releases becoming `confirmed` or `failed`; it rejects refresh of confirmed/cancelled releases, stale releases, missing proofs, missing transaction hash, or missing failure reason. Confirmation records proof data, marks the release confirmed, and releases the milestone. Failure records failure metadata without releasing the milestone (`lib/repositories/release-proof.ts`).

`retryFailedRelease` creates a new queued release for an eligible failed release when its repository checks pass (`lib/repositories/release-retry.ts`). Exact retry eligibility is repository-defined; no broader retry guarantee is claimed here.

### Execution modes

- `browser_wallet`: server execution fails explicitly; browser signing is handled by the wallet boundary.
- `circle_wallet`: `lib/arc/release-executor.ts` sends from the server-side key when configured, then proof refresh persists the result.

Production settlement readiness is not asserted here.

## Authorization, validation, and persistence boundaries

API handlers resolve session-aware product context, apply policy checks, and pass workspace/user identifiers to repositories. Repositories perform transactional reads/writes with Prisma, verify workspace ownership, and record activity for important transitions. Wallet validation and duplicate-wallet protection are contributor-domain constraints, not milestone transition rules.

See `docs/AUTHORIZATION.md` for actor/role permissions and `docs/SECURITY_INVARIANTS.md` for session, workspace, wallet, and secret invariants.

## Terminal and unverified behavior

`completed` is the payout terminal state derived when every milestone is released. `released` is the milestone terminal state in the current workflow. Release `confirmed`, `failed`, and `cancelled` are persisted outcomes, but failed releases may be retried through the repository path.

The implementation does not prove a complete formal state-machine validator for every enum combination, sequential milestone locking, cancellation semantics, or all legacy handlers. Those behaviors are therefore not presented as guaranteed.

## Verification

Inspected `prisma/schema.prisma`, `lib/repositories/payout-creation.ts`, `payout-activation.ts`, `payout-status.ts`, `milestone-submission.ts`, `milestone-review.ts`, `milestone-release.ts`, `release-proof.ts`, `release-retry.ts`, `lib/runtime/product-policy.ts`, `lib/auth/session-server.ts`, `lib/arc/release-executor.ts`, and relevant `app/api/v1/**` handlers.
