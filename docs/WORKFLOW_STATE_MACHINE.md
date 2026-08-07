# WORKFLOW_STATE_MACHINE

## Purpose
This document defines proposed state transitions for SettleFlow's milestone-based payout workflow.

It builds on statuses already present in current application code and adds mutation rules needed for backend implementation.

## Goals
- preserve current product story
- make approval and settlement behavior explicit
- define allowed transitions before API and DB work begin
- keep payout state derived from milestone and release progress where possible

## Current Confirmed Statuses From Code

### Payout
- `draft`
- `active`
- `partially_released`
- `completed`

### Milestone
- `pending`
- `submitted`
- `approved`
- `released`
- `rejected`

### Transaction Proof
- `pending`
- `confirmed`
- `failed`

## State Machine Scope
This spec covers:
- payout lifecycle
- milestone lifecycle
- release lifecycle
- proof lifecycle
- transition actors
- transition guards

It does not yet define:
- background job orchestration details
- provider-specific Arc callback behavior
- multi-reviewer consensus rules

---

# 1. Payout State Machine

## Status meanings

### `draft`
Payout exists but is not yet active for contributor workflow.

Typical characteristics:
- milestones may still be edited
- total and structure may still change
- no release allowed
- no submission expected yet

### `active`
Payout is live and at least one milestone can progress through submission and review.

Typical characteristics:
- contributor can submit work
- reviewers can approve or reject submitted milestones
- release becomes possible for approved milestones

### `partially_released`
At least one milestone has been released, but payout is not fully settled.

Typical characteristics:
- some milestone amount has moved or is confirmed released
- remaining milestones still open

### `completed`
All milestone amounts are released and payout is fully settled according to business rule.

Typical characteristics:
- no further release expected
- payout read-only except metadata or audit additions

## Recommended derived logic
Payout status should be driven by milestone and release progress rather than arbitrary manual setting.

### Suggested derivation rules
- `draft`
  - payout not activated yet
- `active`
  - payout activated
  - no confirmed released amount yet
- `partially_released`
  - some but not all milestone amount released
- `completed`
  - all milestone amount released and final proof confirmed if proof confirmation is required for completion

## Allowed transitions

### `draft` to `active`
Action: activate payout

Allowed actor:
- `owner`
- `ops`
- possibly `reviewer` only if product later permits

Guards:
- payout has contributor
- payout has target wallet
- payout has at least one milestone
- milestone amount sum equals payout total
- all required fields present

### `active` to `partially_released`
Action: confirm first successful release

Allowed actor:
- system-derived after release mutation result

Guards:
- at least one approved milestone released

### `active` to `completed`
Only if single-milestone payout and full amount released in one step.

### `partially_released` to `completed`
Action: confirm final successful release

Allowed actor:
- system-derived after release mutation result

Guards:
- all milestone amounts released
- all required proof/confirmation rules satisfied

## Disallowed transitions
- `completed` to any earlier status
- `draft` directly to `completed` without release
- `draft` to `partially_released`

## Optional future transition
### `draft` or `active` to `cancelled`
Not present in current code status list. Add only if business case becomes necessary.

---

# 2. Milestone State Machine

## Status meanings

### `pending`
Milestone is defined but not yet submitted for review.

### `submitted`
Contributor has submitted work and milestone is waiting for review.

### `approved`
Reviewer has approved submitted work. Milestone is now eligible for release.

### `released`
Associated payout amount for this milestone has been released according to business rule.

### `rejected`
Reviewer has rejected current submission. Milestone requires revision and later resubmission.

## Allowed transitions

### `pending` to `submitted`
Action: submit milestone work

Allowed actor:
- linked contributor user
- contributor-authorized member

Guards:
- payout is `active` or `partially_released`
- milestone belongs to payout
- submission contains required summary and any required artifact links

Side effects:
- create `MilestoneSubmission`
- append `ActivityLog`

### `submitted` to `approved`
Action: approve submission

Allowed actor:
- `owner`
- `ops`
- `reviewer`

Guards:
- milestone has current active submission
- reviewer is not blocked by future separation-of-duties rule

Side effects:
- create `MilestoneReview` with `approved`
- set `approvedAt`
- append `ActivityLog`

### `submitted` to `rejected`
Action: reject submission

Allowed actor:
- `owner`
- `ops`
- `reviewer`

Guards:
- milestone has current active submission
- rejection reason/comment may be required by policy

Side effects:
- create `MilestoneReview` with `rejected`
- set `rejectedAt`
- append `ActivityLog`

### `rejected` to `submitted`
Action: resubmit milestone work

Allowed actor:
- linked contributor user
- contributor-authorized member

Guards:
- payout still open
- new submission created

Side effects:
- create new `MilestoneSubmission`
- keep prior reviews immutable
- append `ActivityLog`

### `approved` to `released`
Action: release milestone amount

Allowed actor:
- `owner`
- `ops`
- possibly `reviewer` only if release authority later overlaps

Guards:
- payout is not `draft` or `completed`
- approved milestone amount not already released
- settlement request passes validation

Side effects:
- create `Release`
- create or update `TransactionProof`
- append `ActivityLog`

## Disallowed transitions
- `pending` to `approved`
- `pending` to `released`
- `submitted` to `released`
- `rejected` to `approved` without new submission
- `released` to earlier milestone states

## Notes on rejected behavior
Recommended rule:
- milestone remains `rejected` until contributor submits again
- new submission changes state back to `submitted`

Reason:
- preserves visible workflow truth
- matches current product story better than silently reverting to `pending`

---

# 3. Release State Machine

## Why separate release state exists
Milestone approval is business approval. Actual transfer execution may still fail, queue, or await confirmation.

## Recommended release statuses
- `queued`
- `pending`
- `confirmed`
- `failed`
- `cancelled`

## Status meanings

### `queued`
Release request accepted by app but not yet sent to Arc.

### `pending`
Send initiated and awaiting provider/network confirmation.

### `confirmed`
Release settled successfully.

### `failed`
Release attempt failed and did not settle.

### `cancelled`
Release request cancelled before execution.

## Allowed transitions
- `queued` to `pending`
- `pending` to `confirmed`
- `pending` to `failed`
- `queued` to `cancelled`

## Disallowed transitions
- `confirmed` to earlier states
- `failed` directly to `confirmed`

## Retry recommendation
Do not mutate failed release into success.
Create new `Release` record for retry.

Reason:
- preserves audit trail
- preserves provider attempt history

---

# 4. Transaction Proof State Machine

## Status meanings

### `pending`
Proof record created but final blockchain confirmation not yet available.

### `confirmed`
Proof contains confirmed settlement evidence.

### `failed`
Settlement failed or proof cannot confirm successful transfer.

## Allowed transitions
- `pending` to `confirmed`
- `pending` to `failed`

## Disallowed transitions
- `confirmed` to `pending`
- `failed` to `confirmed` on same proof record if proof is modeled as immutable result

## Recommendation
If retry happens, create new `Release` and new `TransactionProof`, not overwrite failed proof into success.

---

# 5. Actor Permissions by Transition

## Contributor actor
Can:
- submit milestone
- resubmit rejected milestone
- view own payout and milestone status if access model permits

Cannot:
- approve milestone
- reject milestone
- release funds

## Reviewer actor
Can:
- view assigned payouts
- approve submitted milestone
- reject submitted milestone

Should not release by default unless business rule explicitly combines reviewer and operator roles.

## Ops actor
Can:
- activate payout
- approve or reject milestone if policy allows
- trigger release
- inspect proof and settlement state

## Owner actor
Can:
- all ops actions
- workspace-level administrative actions

---

# 6. Transition Guards

## Activate payout guards
- payout has title
- payout has contributor
- payout has destination wallet
- payout has one or more milestones
- milestone sum equals total payout amount

## Submit milestone guards
- payout is active enough to receive work
- submission actor matches contributor access rule
- milestone not already released

## Approve milestone guards
- milestone currently `submitted`
- current submission exists
- reviewer has permission

## Reject milestone guards
- milestone currently `submitted`
- current submission exists
- reviewer has permission

## Release milestone guards
- milestone currently `approved`
- payout not completed
- release amount valid
- destination wallet valid
- provider request shape valid

## Complete payout guards
- all milestone amounts released
- no unresolved required release left
- final proof confirmation rule satisfied if completion depends on confirmed proof

---

# 7. Recommended Derived UI Rules

## Dashboard
Show counts by:
- payouts in `active`
- payouts in `partially_released`
- milestones in `submitted`
- releases in `pending`
- proofs in `failed`

## Payout detail
- show milestone action controls based on milestone state
- show release panel only for `approved` milestones
- show proof panel from most recent release or payout proof summary

## Create payout flow
- save draft first
- activate separately or auto-activate after validation depending on product decision

Recommended v1 behavior:
- create payout in `draft`
- activate via explicit step or immediate backend post-processing rule

---

# 8. Recommended Event Sequence

## Happy path
1. payout created as `draft`
2. payout activated to `active`
3. contributor submits milestone
4. milestone becomes `submitted`
5. reviewer approves milestone
6. milestone becomes `approved`
7. operator triggers release
8. release becomes `queued` or `pending`
9. proof becomes `pending`
10. release confirms
11. proof confirms
12. milestone becomes `released`
13. payout becomes `partially_released` or `completed`

## Reject and resubmit path
1. milestone `submitted`
2. reviewer rejects
3. milestone becomes `rejected`
4. contributor resubmits
5. milestone returns to `submitted`
6. reviewer approves
7. release proceeds

## Failed settlement path
1. milestone approved
2. release triggered
3. release fails
4. proof becomes `failed`
5. milestone remains `approved`
6. operator may retry by creating new release attempt

This is important:
Milestone should not move to `released` on failed settlement.

---

# 9. Open Product Decisions
These must be locked before implementation:

1. Should payout completion require blockchain confirmation, or only release initiation?
2. Is release strictly one milestone per transaction in v1?
3. Are reviewers and operators separate roles in v1?
4. Does payout start as `draft` or auto-`active` after creation in v1?
5. Should failed release keep milestone in `approved`, or add separate milestone substate later?
6. Is proof shown at payout level, milestone level, or both?

---

# 10. Recommended V1 Rules
If product needs fastest stable backend plan, use these rules:
- payout starts as `draft`
- payout must be activated before submissions
- one release maps to one milestone
- rejected milestone returns to `submitted` only after new submission
- failed release leaves milestone in `approved`
- milestone becomes `released` only after release confirmed
- payout becomes `completed` only when all milestones are `released`

These rules fit current UI, reduce ambiguity, and simplify backend implementation.
