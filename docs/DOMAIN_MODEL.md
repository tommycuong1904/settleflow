# DOMAIN_MODEL

## Purpose
This document defines the proposed persistent domain model for SettleFlow after the current frontend-first demo phase.

It is designed to preserve the existing product story already present in the UI:
- create a payout
- define milestones
- submit work
- review completion
- approve release
- release USDC
- attach settlement proof

This document does not assume a specific database or ORM.

## Design Principles
- keep payout workflow milestone-first
- keep approval separate from settlement execution
- treat settlement proof as first-class data
- support clear audit history
- preserve compatibility with current UI surfaces
- avoid backend assumptions not supported by current product shape

## Core Entities

### 1. Workspace
Represents team or operating group using SettleFlow.

#### Why it exists
Current UI implies a single-team demo. Real app will need data ownership boundary for payouts, contributors, reviewers, and settings.

#### Required fields
- `id`
- `name`
- `slug`
- `createdAt`
- `updatedAt`

#### Optional fields
- `description`
- `defaultCurrency` — initially `USDC`
- `defaultChainId`
- `defaultUsdcAddress`

#### Relationships
- has many `WorkspaceMember`
- has many `Contributor`
- has many `Payout`
- has many `ActivityLog` entries

---

### 2. User
Represents authenticated person interacting with system.

#### Why it exists
Auth (Phase 4) is implemented: a session cookie + middleware resolves the authenticated principal; `getProductContext()` derives the workspace role per route and anonymous mutations are rejected. User, Workspace, and WorkspaceMember rows back review, release, and audit actions.

#### Required fields
- `id`
- `displayName`
- `createdAt`
- `updatedAt`

#### Optional fields
- `email`
- `avatarUrl`
- `walletAddress`

#### Relationships
- has many `WorkspaceMember` records
- may create many `Payout` records
- may author many `MilestoneSubmission` records
- may author many `MilestoneReview` records
- may trigger many `Release` records
- may produce many `ActivityLog` entries

---

### 3. WorkspaceMember
Represents user membership and role inside workspace.

#### Required fields
- `id`
- `workspaceId`
- `userId`
- `role`
- `createdAt`

#### Allowed roles
Initial recommended roles:
- `owner`
- `ops`
- `reviewer`
- `contributor`

#### Notes
Single user may have more than one practical responsibility, but stored role model should stay simple at first.

---

### 4. Contributor
Represents payout recipient identity used by payout workflow.

#### Why it exists
Current UI already treats contributor as distinct business concept. Keep it explicit even if later linked to user account.

#### Required fields
- `id`
- `workspaceId`
- `displayName`
- `walletAddress`
- `createdAt`
- `updatedAt`

#### Optional fields
- `email`
- `notes`
- `linkedUserId`
- `status` — `active` or `archived`

#### Relationships
- belongs to `Workspace`
- may link to `User`
- has many `Payout`
- may author `MilestoneSubmission` records if linked to user

---

### 5. Payout
Represents agreement to pay contributor across one or more milestones.

#### Required fields
- `id`
- `workspaceId`
- `contributorId`
- `title`
- `status`
- `totalAmountUsdc`
- `createdByUserId`
- `createdAt`
- `updatedAt`

#### Optional fields
- `description`
- `currency` — initially `USDC`
- `chainId`
- `usdcTokenAddress`
- `targetWalletAddress`
- `reviewPolicy`
- `startDate`
- `dueDate`
- `completedAt`
- `cancelledAt`

#### Allowed statuses
Use current architecture-confirmed statuses first:
- `draft`
- `active`
- `partially_released`
- `completed`

Recommended future extension if cancellation needed:
- `cancelled`

#### Derived fields
Should be computed, not primary source of truth:
- released amount
- remaining amount
- milestone counts by status
- current settlement progress

#### Relationships
- belongs to `Workspace`
- belongs to `Contributor`
- created by `User`
- has many `Milestone`
- has many `Release`
- has many `TransactionProof`
- has many `ActivityLog` entries

---

### 6. Milestone
Represents approval-gated unit of work within payout.

#### Required fields
- `id`
- `payoutId`
- `title`
- `amountUsdc`
- `sequence`
- `status`
- `createdAt`
- `updatedAt`

#### Optional fields
- `description`
- `acceptanceCriteria`
- `dueDate`
- `submittedAt`
- `approvedAt`
- `rejectedAt`
- `releasedAt`

#### Allowed statuses
Use current code-confirmed values:
- `pending`
- `submitted`
- `approved`
- `released`
- `rejected`

#### Constraints
- sum of milestone amounts should equal payout total amount
- sequence should be unique within payout
- released milestone amount should not be changed afterward

#### Relationships
- belongs to `Payout`
- has many `MilestoneSubmission`
- has many `MilestoneReview`
- may have one or many `Release` records depending on final release model
- may have one or many `TransactionProof` records depending on proof attachment level

---

### 7. MilestoneSubmission
Represents contributor submission for review.

#### Why it exists
Current UI implies submission state, but demo does not yet persist submission artifacts. Backend should separate submission event from milestone record.

#### Required fields
- `id`
- `milestoneId`
- `submittedByUserId`
- `summary`
- `submittedAt`

#### Optional fields
- `artifactUrl`
- `artifactLabel`
- `notes`
- `resubmissionNumber`

#### Notes
- multiple submissions per milestone should be allowed
- latest submission becomes current review subject
- rejected milestone may later receive another submission

#### Relationships
- belongs to `Milestone`
- belongs to `User`
- may be referenced by `MilestoneReview`
- has many `SubmissionArtifact` records if richer attachment model is needed later

---

### 8. MilestoneReview
Represents review decision for submitted milestone work.

#### Required fields
- `id`
- `milestoneId`
- `submissionId`
- `reviewedByUserId`
- `decision`
- `reviewedAt`

#### Allowed decisions
- `approved`
- `rejected`

#### Optional fields
- `comment`
- `decisionReason`

#### Notes
Keep review event immutable. New review should create new record, not overwrite old review history.

#### Relationships
- belongs to `Milestone`
- belongs to `MilestoneSubmission`
- belongs to `User`

---

### 9. Release
Represents settlement intent or execution for approved payout amount.

#### Why it exists
Approval and payment execution are separate business events. This separation is critical for auditability and retry handling.

#### Required fields
- `id`
- `payoutId`
- `triggeredByUserId`
- `amountUsdc`
- `status`
- `createdAt`
- `updatedAt`

#### Optional fields
- `milestoneId` — if release is tracked per milestone
- `requestedAt`
- `executedAt`
- `failedAt`
- `failureReason`
- `arcRequestId`
- `destinationWalletAddress`

#### Recommended statuses
- `queued`
- `pending`
- `confirmed`
- `failed`
- `cancelled`

#### Notes
- `Release` status is not same as `TransactionProof` status
- payout UI may still show milestone status `released` only after confirmed settlement or after business-approved release event, depending on final product decision

#### Relationships
- belongs to `Payout`
- optionally belongs to `Milestone`
- belongs to `User`
- has one or many `TransactionProof` records

---

### 10. TransactionProof
Represents settlement evidence after Arc send attempt.

#### Required fields
- `id`
- `payoutId`
- `status`
- `createdAt`
- `updatedAt`

#### Optional fields
- `releaseId`
- `milestoneId`
- `transactionHash`
- `explorerUrl`
- `networkName`
- `blockNumber`
- `confirmedAt`
- `failedAt`
- `failureReason`
- `rawProviderPayload`

#### Allowed statuses
Use current architecture-confirmed values:
- `pending`
- `confirmed`
- `failed`

#### Notes
Proof should exist even for failed settlement attempts when traceability matters.

#### Relationships
- belongs to `Payout`
- may belong to `Milestone`
- may belong to `Release`

---

### 11. ActivityLog
Represents immutable audit trail.

#### Why it exists
SettleFlow product value includes transparent settlement status and workflow traceability.

#### Required fields
- `id`
- `workspaceId`
- `actorUserId`
- `entityType`
- `entityId`
- `action`
- `occurredAt`

#### Optional fields
- `payoutId`
- `milestoneId`
- `releaseId`
- `metadataJson`

#### Example actions
- `payout.created`
- `milestone.submitted`
- `milestone.approved`
- `milestone.rejected`
- `release.requested`
- `release.confirmed`
- `proof.attached`

---

## Relationship Summary

### Workspace-centered
- `Workspace` 1:N `WorkspaceMember`
- `Workspace` 1:N `Contributor`
- `Workspace` 1:N `Payout`
- `Workspace` 1:N `ActivityLog`

### Payout-centered
- `Contributor` 1:N `Payout`
- `Payout` 1:N `Milestone`
- `Payout` 1:N `Release`
- `Payout` 1:N `TransactionProof`
- `Payout` 1:N `ActivityLog`

### Milestone-centered
- `Milestone` 1:N `MilestoneSubmission`
- `MilestoneSubmission` 1:N or 1:1 `MilestoneReview` depending on final review model
- `Milestone` 0:N `Release`
- `Milestone` 0:N `TransactionProof`

## Recommended Modeling Decisions

### Keep submission separate from milestone
Reason:
- supports resubmission
- preserves review history
- avoids milestone row becoming overloaded record

### Keep review separate from submission and milestone
Reason:
- allows immutable decision history
- makes audit and analytics easier
- keeps actor attribution explicit

### Keep release separate from proof
Reason:
- payment request and blockchain confirmation are not same event
- easier retry/error handling
- future Arc integration will need intermediate statuses

### Allow proof attachment at payout level first
Reason:
- current UI already shows payout-level settlement proof comfortably
- milestone-level proof can still be stored later if needed

## Invariants
- payout must have at least one milestone before activation
- payout total must equal sum of milestone amounts
- milestone cannot be approved without at least one submission
- milestone cannot be released before approval
- release amount cannot exceed milestone amount if milestone-linked
- payout cannot be marked completed until all milestone amounts are released and confirmed according to final business rule
- proof cannot reference non-existent payout or release

## Open Questions
These should be resolved before DB schema is finalized:

1. Is proof attached per payout, per release, or both?
2. Is each release always tied to exactly one milestone?
3. Can multiple milestones be batch-released in one transaction?
4. Does rejected milestone revert to `pending` after resubmission, or stay `rejected` until new submission?
5. Do contributors need full user accounts, or can they remain external recipients first?
6. Should payout support cancellation in v1 backend?
7. Is there ever more than one reviewer required for approval?

## Minimal V1 Backend Scope
If backend scope needs to stay narrow, start with these persisted entities:
- `Workspace`
- `User`
- `WorkspaceMember`
- `Contributor`
- `Payout`
- `Milestone`
- `MilestoneSubmission`
- `MilestoneReview`
- `Release`
- `TransactionProof`

`ActivityLog` can be added in same phase or immediately after core mutations exist.
