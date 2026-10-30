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

`UserWallet` is the canonical account-to-wallet link. Google/Circle and Web3
sign-in provision independent users. One user may explicitly link a new EVM
wallet, while each normalized address belongs to exactly one user. It records
the wallet kind and whether it may authenticate or fund a release.
The legacy `User.walletAddress` remains only as a compatibility field during
the staged migration. `CircleUserWallet` retains Circle-specific identifiers
and references the corresponding `UserWallet` link.

`PaymentAccount` is the provider-neutral record for an embedded or managed
payment account. It persists only the provider identifier, non-secret external
account identifier, lifecycle status, and optional canonical `UserWallet` link.
It never stores a private key, provider credential, or user token. Provider
adapters own account provisioning; payout workflows consume the neutral record.

`User.paymentAccountOnboardingSkippedAt` records an explicit, account-scoped
deferral of the optional Google payment-account onboarding. It prevents a
future sign-in from repeatedly forcing the setup; it neither creates a wallet
nor affects payment eligibility. A ready `CircleUserWallet` always suppresses
onboarding regardless of this value.

### WorkspaceMember and role

`WorkspaceMember` links a `User` to a `Workspace` and stores one `WorkspaceMemberRole`: `owner`, `ops`, `reviewer`, or `contributor`. A database uniqueness constraint allows only one membership row for each `(workspaceId, userId)`. The active MVP exposes one Owner per workspace and contributor invitations only; `owner`, `ops`, and `reviewer` remain for historical memberships. The runtime actor has the corresponding values: `owner`, `ops`, `reviewer`, and `contributor`. Database roles and runtime actors must not be treated as interchangeable. Detailed policy is in `docs/AUTHORIZATION.md`.

## Participants and payout agreement

### Contributor

`Contributor` is a workspace-scoped recipient profile with an optional wallet address, optional linked user, optional creator, contact fields, role/notes, and `active` or `archived` status. Contributor creation and update validate an EVM wallet when one is provided and prevent duplicate wallet addresses within a workspace. When an already-linked user provisions a Circle Arc SCA, a missing recipient address may be filled from that verified account; an explicitly stored workspace address is never overwritten.

### Payout

`Payout` is the agreement between a workspace and one contributor. It records the creator, title/description, USDC total, optional target wallet and chain/token configuration, dates, and a `PayoutStatus`. At creation, a missing target wallet can be resolved from the linked Contributor's verified Arc Circle SCA and is then snapshotted on the payout; later profile changes do not redirect it. A payout owns milestones, releases, proofs, and activity logs. Its contributor and workspace relations are restrictive on delete.

### Milestone

`Milestone` is an ordered, amount-bearing part of a payout. `(payoutId, sequence)` is unique. It owns submissions, reviews, releases, proofs, and activity logs. Timestamps record submission, approval, rejection, and release events.

## Evidence, review, and settlement

### MilestoneSubmission

A submission records the submitting user, summary, optional artifact metadata and notes, submission time, and resubmission number. It belongs to one milestone and may be reviewed.

### MilestoneReview

A review attaches a reviewer and decision (`approved` or `rejected`) to a submission. Rejection comments and reviewability rules are enforced by `lib/repositories/milestone-review.ts`.

### Release

`Release` represents a requested settlement for a payout/milestone. It records triggering user, amount, execution mode, destination/source wallets, and an optional immutable `sourceWalletId` link for account-owned wallet paths, plus Arc request/transaction metadata and `ReleaseStatus` (`queued`, `pending`, `confirmed`, `failed`, `cancelled`).

### TransactionProof

`TransactionProof` records settlement evidence associated with a payout and optionally a milestone/release: status (`pending`, `confirmed`, `failed`), transaction hash, network, explorer URL, block number, timestamps, and failure reason. Transaction hashes are unique when present.

### PaymentAttempt

`PaymentAttempt` is the method-neutral business record for one milestone payment. It snapshots method, status, evidence type, amount, currency, recipient label, actor and timestamps. The initial `simulated` method is test-only, completes with `evidenceType = none`, and never creates a `TransactionProof`, transaction hash, explorer URL, or onchain settlement claim. The unique milestone relation prevents a second payment attempt from being created for the same milestone.

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
- `PaymentMethod`: `simulated`, `crypto_wallet`.
- `PaymentStatus`: `pending`, `completed`, `failed`, `cancelled`.
- `PaymentEvidenceType`: `none`, `transaction`.

USDC amounts use Prisma `Decimal(30, 6)`. Payout activation requires at least one milestone and milestone amounts equal to the payout total; a target wallet is optional for method-neutral and simulated flows. A wallet release still requires a valid destination wallet and fails closed without one. Milestones are unique by sequence within a payout.

## Persistence and runtime distinction

The Prisma schema is authoritative for persistence and relationships. Repositories implement business transitions and workspace checks. Runtime actor values and authorization roles are application concepts layered over persisted users and memberships. Some legacy mock records remain under `lib/data/`; they are not the primary domain persistence model.

## Future or not verified

The schema does not establish escrow contracts, multi-chain bridging, multi-signature approvals, or KYC/KYB attestations as implemented domain behavior. Any such capability is future/proposed or not verified.

## Verification

Inspected `prisma/schema.prisma`, `lib/repositories/**` relevant to contributors, payouts, milestones, releases, proofs and activity, `lib/auth/session-mapping.ts`, `lib/runtime/product-context.ts`, `lib/runtime/product-policy.ts`, and relevant `app/api/v1/**` handlers.
