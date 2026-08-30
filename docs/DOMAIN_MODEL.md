# DOMAIN_MODEL

Status: current
SSoT: `prisma/schema.prisma` + repositories
Last verified: 2026-08

## Purpose and scope

This document describes the domain concepts and relationships that are currently represented and used by SettleFlow. It is not a complete column catalogue, authorization matrix, or roadmap. See `docs/AUTHORIZATION.md` for permissions and `docs/SECURITY_INVARIANTS.md` for security guarantees.

## Tenancy and identity

### Workspace

`Workspace` is the tenant boundary. It owns contributors, payouts, and activity logs, and stores workspace-level configuration such as currency/chain defaults and webhook settings.

### User

`User` is the persisted authenticated identity. It can be a workspace member, payout creator, contributor creator, milestone submitter, reviewer, release trigger, or activity actor. A user may optionally be linked to a contributor profile.

### WorkspaceMember and role

`WorkspaceMember` links a `User` to a `Workspace` and stores one `WorkspaceMemberRole`: `owner`, `ops`, `reviewer`, or `contributor`. The runtime actor is a separate type: `owner`, `reviewer`, or `contributor`. `lib/auth/session-mapping.ts` explicitly maps `ops` to `owner`; database roles and runtime actors must not be treated as interchangeable. Detailed policy is in `docs/AUTHORIZATION.md`.

## Participants and payout agreement

### Contributor

`Contributor` is a workspace-scoped recipient profile with a wallet address, optional linked user, optional creator, contact fields, role/notes, and `active` or `archived` status. Contributor creation and update validate the EVM wallet and prevent duplicate wallet addresses within a workspace.

### Payout

`Payout` is the agreement between a workspace and one contributor. It records the creator, title/description, USDC total, optional target wallet and chain/token configuration, dates, and a `PayoutStatus`. A payout owns milestones, releases, proofs, and activity logs. Its contributor and workspace relations are restrictive on delete.

### Milestone

`Milestone` is an ordered, amount-bearing part of a payout. `(payoutId, sequence)` is unique. It owns submissions, reviews, releases, proofs, and activity logs. Timestamps record submission, approval, rejection, and release events.

## Evidence, review, and settlement

### MilestoneSubmission

A submission records the submitting user, summary, optional artifact metadata and notes, submission time, and resubmission number. It belongs to one milestone and may be reviewed.

### MilestoneReview

A review attaches a reviewer and decision (`approved` or `rejected`) to a submission. Rejection comments and reviewability rules are enforced by `lib/repositories/milestone-review.ts`.

### Release

`Release` represents a requested settlement for a payout/milestone. It records triggering user, amount, execution mode (`browser_wallet` or `circle_wallet`), destination/source wallets, Arc request/transaction metadata, and `ReleaseStatus` (`queued`, `pending`, `confirmed`, `failed`, `cancelled`).

### TransactionProof

`TransactionProof` records settlement evidence associated with a payout and optionally a milestone/release: status (`pending`, `confirmed`, `failed`), transaction hash, network, explorer URL, block number, timestamps, and failure reason. Transaction hashes are unique when present.

### ActivityLog

`ActivityLog` records workspace-scoped domain events with actor, entity, optional payout/milestone/release references, action, metadata, and occurrence time.

## Important enums and constraints

- `ContributorStatus`: `active`, `archived`.
- `PayoutStatus`: `draft`, `active`, `partially_released`, `completed`.
- `MilestoneStatus`: `pending`, `submitted`, `approved`, `released`, `rejected`.
- `ReviewDecision`: `approved`, `rejected`.
- `ReleaseExecutionMode`: `browser_wallet`, `circle_wallet`.
- `ReleaseStatus`: `queued`, `pending`, `confirmed`, `failed`, `cancelled`.
- `TransactionProofStatus`: `pending`, `confirmed`, `failed`.

USDC amounts use Prisma `Decimal(30, 6)`. Payout activation requires a target wallet, at least one milestone, and milestone amounts equal to the payout total. Milestones are unique by sequence within a payout.

## Persistence and runtime distinction

The Prisma schema is authoritative for persistence and relationships. Repositories implement business transitions and workspace checks. Runtime actor values and authorization roles are application concepts layered over persisted users and memberships. Some legacy mock records remain under `lib/data/`; they are not the primary domain persistence model.

## Future or not verified

The schema does not establish escrow contracts, multi-chain bridging, multi-signature approvals, or KYC/KYB attestations as implemented domain behavior. Any such capability is future/proposed or not verified.

## Verification

Inspected `prisma/schema.prisma`, `lib/repositories/**` relevant to contributors, payouts, milestones, releases, proofs and activity, `lib/auth/session-mapping.ts`, `lib/runtime/product-context.ts`, `lib/runtime/product-policy.ts`, and relevant `app/api/v1/**` handlers.
