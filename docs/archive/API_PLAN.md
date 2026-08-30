# API_PLAN

Archive status: implemented-by: `app/api/v1/**`

## Purpose
This document defines proposed backend API surface for SettleFlow after the current demo phase.

It is intentionally product-first, not framework-first.
Routes and payloads may later be implemented with Next.js Route Handlers, Server Actions, or separate backend service.

## API Goals
- support current UI surfaces without redesign
- preserve milestone-first payout workflow
- separate read models from mutation actions where helpful
- make release and proof lifecycle explicit
- leave room for future auth and Arc integration

## Current UI Surfaces To Support
The API plan must support these confirmed pages:
- `/` — no backend dependency required beyond optional CMS/settings later
- `/dashboard`
- `/payouts/new`
- `/payouts/[id]`

## Recommended API Style
Use resource-oriented read endpoints plus action-oriented mutation endpoints.

Reason:
- payout and milestone are stable resources
- submit, approve, reject, and release are explicit workflow actions
- action endpoints map cleanly to audit and permissions

## Versioning
Recommended initial prefix:
- `/api/v1/...`

---

# 1. Read APIs

## 1.1 Get dashboard summary
### Route
`GET /api/v1/dashboard`

### Purpose
Load operational summary for dashboard route.

### Response shape
```json
{
  "stats": {
    "activePayouts": 0,
    "pendingReviewMilestones": 0,
    "confirmedSettlements": 0,
    "totalOutstandingUsdc": "0"
  },
  "reviewQueue": [],
  "activePayouts": [],
  "recentProofs": []
}
```

### Notes
Can be split later if dashboard becomes too heavy.

---

## 1.2 List payouts
### Route
`GET /api/v1/payouts`

### Query params
- `status`
- `contributorId`
- `page`
- `pageSize`
- `search`

### Purpose
List payouts for future table/list views and internal selectors.

### Response shape
```json
{
  "items": [
    {
      "id": "p_123",
      "title": "Community Campaign Design",
      "status": "active",
      "totalAmountUsdc": "300",
      "releasedAmountUsdc": "100",
      "contributor": {
        "id": "c_123",
        "displayName": "Jane Doe"
      },
      "milestoneSummary": {
        "total": 3,
        "submitted": 1,
        "approved": 1,
        "released": 1
      },
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

---

## 1.3 Get payout detail
### Route
`GET /api/v1/payouts/:payoutId`

### Purpose
Load payout detail page data.

### Response shape
```json
{
  "payout": {
    "id": "p_123",
    "title": "Community Campaign Design",
    "status": "partially_released",
    "description": "...",
    "totalAmountUsdc": "300",
    "releasedAmountUsdc": "100",
    "remainingAmountUsdc": "200",
    "targetWalletAddress": "0x...",
    "contributor": {
      "id": "c_123",
      "displayName": "Jane Doe",
      "walletAddress": "0x..."
    },
    "milestones": [],
    "latestProof": null,
    "releases": [],
    "activity": []
  }
}
```

### Notes
For v1, this route may return denormalized data to keep UI simple.

---

## 1.4 List contributors
### Route
`GET /api/v1/contributors`

### Purpose
Populate create payout form and contributor selection surfaces.

### Query params
- `status`
- `search`

### Response shape
```json
{
  "items": [
    {
      "id": "c_123",
      "displayName": "Jane Doe",
      "walletAddress": "0x...",
      "status": "active"
    }
  ]
}
```

---

## 1.5 Get release attempts for payout
### Route
`GET /api/v1/payouts/:payoutId/releases`

### Purpose
Expose settlement history if payout detail later separates releases into dedicated panel.

---

## 1.6 Get proof history for payout
### Route
`GET /api/v1/payouts/:payoutId/proofs`

### Purpose
Expose settlement proof records beyond latest proof.

---

# 2. Payout Creation and Editing APIs

## 2.1 Create payout draft
### Route
`POST /api/v1/payouts`

### Purpose
Persist payout and milestone structure from create payout flow.

### Request shape
```json
{
  "title": "Community Campaign Design",
  "description": "...",
  "contributorId": "c_123",
  "targetWalletAddress": "0x...",
  "totalAmountUsdc": "300",
  "currency": "USDC",
  "milestones": [
    {
      "title": "Research",
      "description": "...",
      "amountUsdc": "100",
      "sequence": 1
    }
  ]
}
```

### Response shape
```json
{
  "payout": {
    "id": "p_123",
    "status": "draft"
  }
}
```

### Validation rules
- title required
- contributor required
- target wallet required
- at least one milestone required
- milestone amount sum must equal total payout amount
- currency limited to `USDC` in v1

---

## 2.2 Update payout draft
### Route
`PATCH /api/v1/payouts/:payoutId`

### Purpose
Allow editing draft payout before activation.

### Guard
- payout must be `draft`

### Notes
For v1, keep editing restricted to draft only.

---

## 2.3 Activate payout
### Route
`POST /api/v1/payouts/:payoutId/activate`

### Purpose
Move payout from `draft` to `active`.

### Response shape
```json
{
  "payout": {
    "id": "p_123",
    "status": "active"
  }
}
```

---

# 3. Milestone Workflow APIs

## 3.1 Submit milestone work
### Route
`POST /api/v1/milestones/:milestoneId/submit`

### Purpose
Create submission and move milestone into review.

### Request shape
```json
{
  "summary": "Completed first campaign draft.",
  "artifactUrl": "https://...",
  "artifactLabel": "Figma file",
  "notes": "Ready for review"
}
```

### Response shape
```json
{
  "milestone": {
    "id": "m_123",
    "status": "submitted"
  },
  "submission": {
    "id": "ms_123",
    "submittedAt": "2025-01-01T00:00:00Z"
  }
}
```

---

## 3.2 Approve milestone
### Route
`POST /api/v1/milestones/:milestoneId/approve`

### Purpose
Approve latest active submission.

### Request shape
```json
{
  "comment": "Approved for release"
}
```

### Response shape
```json
{
  "milestone": {
    "id": "m_123",
    "status": "approved"
  },
  "review": {
    "id": "mr_123",
    "decision": "approved"
  }
}
```

---

## 3.3 Reject milestone
### Route
`POST /api/v1/milestones/:milestoneId/reject`

### Purpose
Reject latest active submission.

### Request shape
```json
{
  "comment": "Need clearer final assets"
}
```

### Response shape
```json
{
  "milestone": {
    "id": "m_123",
    "status": "rejected"
  },
  "review": {
    "id": "mr_123",
    "decision": "rejected"
  }
}
```

### Recommendation
Require rejection comment in v1 for audit clarity.

---

## 3.4 Get milestone submissions
### Route
`GET /api/v1/milestones/:milestoneId/submissions`

### Purpose
Support future richer milestone review history.

---

# 4. Release and Settlement APIs

## 4.1 Trigger release for milestone
### Route
`POST /api/v1/milestones/:milestoneId/release`

### Purpose
Create release attempt for approved milestone.

### Request shape
```json
{
  "amountUsdc": "100"
}
```

### Response shape
```json
{
  "release": {
    "id": "r_123",
    "status": "queued",
    "amountUsdc": "100"
  },
  "proof": {
    "id": "tp_123",
    "status": "pending"
  }
}
```

### Guards
- milestone must be `approved`
- amount must match allowed release amount
- destination wallet must be present

### Notes
For v1, one milestone should map to one release.

---

## 4.2 Get release detail
### Route
`GET /api/v1/releases/:releaseId`

### Purpose
Inspect release status and provider response.

---

## 4.3 Retry failed release
### Route
`POST /api/v1/releases/:releaseId/retry`

### Purpose
Create new release attempt from failed release context.

### Recommended behavior
- do not mutate failed release into success
- create new release record
- create new proof record

---

## 4.4 Attach or refresh transaction proof
### Route
`POST /api/v1/releases/:releaseId/proof/refresh`

### Purpose
Fetch or reconcile latest proof state from provider/network.

### Notes
Could later be internal-only if background jobs own reconciliation.

---

# 5. Activity and Audit APIs

## 5.1 Get payout activity log
### Route
`GET /api/v1/payouts/:payoutId/activity`

### Purpose
Show immutable workflow history.

### Response shape
```json
{
  "items": [
    {
      "id": "a_123",
      "action": "milestone.approved",
      "actor": {
        "id": "u_123",
        "displayName": "Ops Lead"
      },
      "occurredAt": "2025-01-01T00:00:00Z",
      "metadata": {}
    }
  ]
}
```

---

# 6. Authentication and Authorization Plan

## Current state
No auth is currently implemented.

## Recommended future model
All write endpoints require authenticated actor.

### Role expectations
- `owner`
- `ops`
- `reviewer`
- `contributor`

### High-level access rules

#### Contributor
Can:
- read own payouts if allowed
- submit milestone
- resubmit rejected milestone

Cannot:
- activate payout
- approve/reject
- release funds

#### Reviewer
Can:
- read review queue
- approve/reject submitted milestones

#### Ops / Owner
Can:
- create payout
- activate payout
- approve/reject if policy allows
- trigger release
- inspect proof details

## Authorization placement
Recommend three layers:
1. route authentication
2. workspace membership check
3. action-level business guard

---

# 7. Error Shape Recommendation
Use consistent error payloads.

## Example
```json
{
  "error": {
    "code": "MILESTONE_NOT_APPROVED",
    "message": "Milestone must be approved before release."
  }
}
```

## Useful error codes
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `PAYOUT_NOT_DRAFT`
- `PAYOUT_NOT_ACTIVE`
- `MILESTONE_NOT_SUBMITTED`
- `MILESTONE_NOT_APPROVED`
- `RELEASE_ALREADY_EXISTS`
- `INVALID_AMOUNT`
- `PROOF_NOT_AVAILABLE`
- `ARC_SEND_FAILED`

---

# 8. Suggested Read Models For UI

## Dashboard read model
Optimize for single fetch.

Contains:
- summary stats
- pending review queue
- active payouts list
- recent settlement proofs

## Payout detail read model
Optimize for single fetch.

Contains:
- payout header
- contributor info
- milestone list with current state
- latest submission/review summary per milestone
- release summary
- latest proof
- activity timeline

This read model can be assembled server-side from normalized tables.

---

# 9. Implementation Order Recommendation

## Phase 1
- `POST /api/v1/payouts`
- `PATCH /api/v1/payouts/:payoutId`
- `POST /api/v1/payouts/:payoutId/activate`
- `GET /api/v1/payouts/:payoutId`
- `GET /api/v1/contributors`

Reason:
Create persistence backbone first.

## Phase 2
- `POST /api/v1/milestones/:milestoneId/submit`
- `POST /api/v1/milestones/:milestoneId/approve`
- `POST /api/v1/milestones/:milestoneId/reject`
- `GET /api/v1/dashboard`

Reason:
Enable review workflow and operational dashboard.

## Phase 3
- `POST /api/v1/milestones/:milestoneId/release`
- `GET /api/v1/releases/:releaseId`
- `GET /api/v1/payouts/:payoutId/proofs`
- `GET /api/v1/payouts/:payoutId/activity`

Reason:
Layer in settlement execution after workflow state is stable.

## Phase 4
- retry and reconciliation endpoints
- auth hardening
- background settlement sync

---

# 10. Open API Decisions
These must be resolved before implementation:

1. Will backend use Route Handlers, Server Actions, or separate service?
2. Will payout detail use one aggregated endpoint or multiple smaller endpoints in v1?
3. Should release endpoint be synchronous or job-based?
4. Will proof refresh be user-triggered, system-triggered, or both?
5. Should contributor access be authenticated account-based in v1, or internal-ops-only first?
6. Is batch release out of scope for v1?

---

# 11. Recommended V1 API Scope
If delivery speed matters most, implement only:
- `GET /api/v1/dashboard`
- `GET /api/v1/contributors`
- `POST /api/v1/payouts`
- `PATCH /api/v1/payouts/:payoutId`
- `POST /api/v1/payouts/:payoutId/activate`
- `GET /api/v1/payouts/:payoutId`
- `POST /api/v1/milestones/:milestoneId/submit`
- `POST /api/v1/milestones/:milestoneId/approve`
- `POST /api/v1/milestones/:milestoneId/reject`
- `POST /api/v1/milestones/:milestoneId/release`

This is enough to turn current demo shape into first real app workflow.
