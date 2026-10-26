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
- After a confirmed Arc release proof or a completed simulated payment, `recalculatePayoutStatus` derives `active`, `partially_released`, or `completed` from milestone statuses (`lib/repositories/payout-status.ts`). All milestones released yields `completed` and `completedAt`; some released yields `partially_released`.

There is no separately verified pause, cancel, or formal transition table beyond these repository rules. A payout with no milestones is derived as `draft`.

## Milestone

States: `pending`, `submitted`, `approved`, `rejected`, `released`.

### Supported transitions

- `pending -> submitted` and `rejected -> submitted`: `submitMilestone` requires the same workspace, a valid contributor user, a linked contributor relationship, an `active` or `partially_released` payout, and a submittable milestone status. Draft payouts are not contributor-visible or submittable. It creates a `MilestoneSubmission` and resets review/release timestamps (`lib/repositories/milestone-submission.ts`).
- `submitted -> approved`: `reviewMilestone(..., "approved")` requires a submitted milestone with a submission and an Owner workspace role in the active Owner/Contributor MVP (`lib/repositories/milestone-review.ts`).
- `submitted -> rejected`: the same function requires an Owner, a non-empty rejection comment, and records a rejected review.
- `approved -> released`: `refreshReleaseProof` sets the milestone to `released` when confirmation is recorded for an approved Arc release. In mock/demo execution modes, `completeSimulatedPayment` may atomically create a completed simulated `PaymentAttempt` with no evidence and set an approved milestone to `released` (`lib/repositories/simulated-payment.ts`). Release queueing and simulated payment both require every earlier-sequence milestone in the payout to be `released`.

No direct transition to `released` is supported by the queue operation. Release queuing and simulated payment both require `approved` first.

## Release and proof

### Release states

`ReleaseStatus` values are `queued`, `pending`, `confirmed`, `failed`, and `cancelled`.

`queueMilestoneRelease` creates `queued` release and `pending` proof records only when the milestone is approved, the payout is `active` or `partially_released`, no release already exists, the destination exists, and the requested amount equals the milestone amount. The release route requires an Owner session and a release source: a Web3 session uses its authenticated enabled EOA; a Google session uses its ready Circle Arc Testnet payment account when the explicit Circle gate is enabled.

Before opening a browser wallet in `real` mode, the client calls the read-only `GET /api/v1/milestones/[id]/release` readiness check. It applies Owner authorization and the server-side real-execution gate but creates no release/proof record. `POST` remains the only endpoint that queues a release.

For a pending browser-wallet release whose wallet callback did not provide a hash, technical reconciliation may search recent, confirmed Arc USDC `Transfer` logs from the snapshotted source to the snapshotted destination after the release request, then apply the same full transaction verifier. Confirmation still requires the normal proof-refresh verifier. After a 60-second callback grace period, the guarded technical closure route repeats that reconciliation and changes the attempt to `failed` only when no matching transaction is found. A never-claimed `queued` browser attempt receives that same server-side check rather than being assumed safe. Only a browser release closed through this reconciliation may be replaced with a Google Owner's Circle payment-account release; it is never retried through the old browser-wallet path. Ambiguous or matching results remain pending.

The executor may move execution through its mode-specific send path. `refreshReleaseProof` supports `queued`/`pending` releases becoming `confirmed` or `failed`; it rejects refresh of confirmed/cancelled releases, stale releases, missing proofs, missing transaction hash, or missing failure reason. Confirmation records proof data, marks the release confirmed, and releases the milestone. Failure records failure metadata without releasing the milestone (`lib/repositories/release-proof.ts`).

`retryFailedRelease` creates a new queued release for an eligible failed release when its repository checks pass (`lib/repositories/release-retry.ts`). Exact retry eligibility is repository-defined; no broader retry guarantee is claimed here.

### Execution modes

- `browser_wallet`: server execution fails explicitly; browser signing is handled by the wallet boundary.
- `circle_wallet`: `lib/arc/release-executor.ts` sends from the server-side key when configured, then proof refresh persists the result.
- `circle_user_wallet`: a Google Owner queues a release only after a ready Circle Arc Testnet SCA/payment-account link is verified. The browser holds Circle's short-lived session material and explicitly confirms the provider challenge; the server then verifies the resulting transaction before confirming proof. This path is gated by `CIRCLE_USER_CONTROLLED_ENABLED` and remains operationally testnet-only.

Production settlement readiness is not asserted here.

## Authorization, validation, and persistence boundaries

API handlers resolve session-aware product context, apply policy checks, and pass workspace/user identifiers to repositories. Repositories perform transactional reads/writes with Prisma, verify workspace ownership, and record activity for important transitions. Wallet validation and duplicate-wallet protection are contributor-domain constraints, not milestone transition rules.

See `docs/AUTHORIZATION.md` for actor/role permissions and `docs/SECURITY_INVARIANTS.md` for session, workspace, wallet, and secret invariants.

## Terminal and unverified behavior

`completed` is the payout terminal state derived when every milestone is released. `released` is the milestone terminal state in the current workflow. Release `confirmed`, `failed`, and `cancelled` are persisted outcomes, but failed releases may be retried through the repository path.

The implementation does not prove a complete formal state-machine validator for every enum combination, cancellation semantics, or all legacy handlers. Those behaviors are therefore not presented as guaranteed.

## Verification

Inspected `prisma/schema.prisma`, `lib/repositories/payout-creation.ts`, `payout-activation.ts`, `payout-status.ts`, `milestone-submission.ts`, `milestone-review.ts`, `milestone-release.ts`, `release-proof.ts`, `release-retry.ts`, `lib/runtime/product-policy.ts`, `lib/auth/session-server.ts`, `lib/arc/release-executor.ts`, and relevant `app/api/v1/**` handlers.
