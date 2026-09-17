# AUTHORIZATION

Status: current
SSoT: Current auth/session/policy implementation
Last verified: 2026-08

## Scope and terminology

- **Workspace membership role** is the role stored on `WorkspaceMember` in Prisma.
- **Product actor** is the runtime identity used by product policy checks.
- **Permission** is an operation-specific result from an `assertCan...` policy function.
- **Workspace membership** links a user to a workspace and supplies the stored role used to derive the product actor.

The database role and runtime actor are intentionally not the same enum.

## Current roles and actor mapping

`WorkspaceMemberRole` currently contains four values:

`owner`, `ops`, `reviewer`, `contributor`.

`ProductActor` currently contains four values:

`owner`, `ops`, `reviewer`, `contributor`.

The implemented mapping is:

| WorkspaceMemberRole | ProductActor | Meaning in current policy |
| --- | --- | --- |
| `owner` | `owner` | owner-level operations |
| `ops` | `ops` | operational access defined by the applicable policy |
| `reviewer` | `reviewer` | review operations |
| `contributor` | `contributor` | submission and contributor-scoped viewing |

Unknown stored role strings are rejected by `mapMembershipRoleToActor`; they do not receive Owner-equivalent authority.

## Current actor permissions

## Phase 2 Authorization Policy v1

The approved Phase 2 baseline defines authorization as:

```text
authorization = role + workspace scope + relationship + state + capability
```

### Policy baseline
- **Owner** is the financial authority for the workspace.
- **Ops is not Owner-equivalent** and cannot release USDC in the Phase 2 baseline.
- **Reviewer** may review, approve, or reject submitted milestones within workspace scope.
- **Contributor** has relationship-scoped access to their own resources and may submit or resubmit their own milestone work.
- `createdByUserId` is provenance/audit data, not the primary authorization boundary.
- Roles are scoped to a workspace.

### Core Authorization Matrix v1

| Action | Role | Workspace scope | Required relationship | Allowed state | Expected result |
| --- | --- | --- | --- | --- | --- |
| Create payout | Owner | Target workspace | Owner membership | N/A | Create draft payout |
| Edit/activate payout | Owner | Payout workspace | Payout belongs to workspace | `draft` | Update or activate after validation |
| Submit/resubmit milestone | Contributor | Milestone/payout workspace | Linked contributor relationship | `pending`, `rejected` | Create submission; state → `submitted` |
| Approve/reject milestone | Reviewer | Milestone/payout workspace | Submitted milestone in scope | `submitted` | Record review; state → `approved`/`rejected` |
| Queue/release funds | Owner | Milestone/payout workspace | Approved milestone in scope | Approved milestone; active payout | Create/execute release |
| Refresh/retry proof/release | Owner | Release/payout workspace | Release belongs to workspace | `queued`/`pending` or `failed` | Confirm/fail or create eligible retry |
| View lifecycle data | Owner/Reviewer; Contributor relationship-scoped | Resource workspace | Contributor relationship where applicable | Existing resource | Return permitted data |
| Mutate contributor/settings | Owner | Workspace | Resource belongs to workspace | Route-allowed state | Update if authorized |

### Current implementation distinction

This is the approved policy baseline, not a claim that the current implementation fully conforms to it. Current implementation and verified behavior are recorded separately below.

### VERIFIED behavior
- DB-backed adversarial tests verified cross-workspace denial and same-workspace Contributor A/B isolation for tested payout, activity, release, contributor-list, and dashboard reads.
- Contributor A's tested payout, milestone, release, proof, and contributor mutations against Contributor B's resources were denied.
- Rejected mutations left the checked payout, milestone, contributor, release, and transaction-proof records unchanged.
- Forged actor/workspace/user fields did not replace session authority in the tested routes.
- The completed tests found **0 confirmed authorization vulnerabilities**.

### ARCHITECTURAL RISK
- `WorkspaceMember` permits exactly one row per user/workspace (`@@unique([workspaceId, userId])`). The migration fails before changing the constraint if historical multi-role rows exist, so an operator must resolve them explicitly.
- `ops` maps to the `ops` ProductActor and is evaluated by the applicable policy.
- Complete legacy/v1 parity and repository scope coverage are not established by the focused tests.

### NOT VERIFIED
- Direct reads for milestone, submission, review, and transaction proof were not separately verified where no dedicated GET route was covered.
- Full legacy `/api/**` versus `/api/v1/**` parity, `ops` privilege escalation, and complete forged cookie/header/body coverage remain unverified.

The centralized policy functions currently enforce:

- `owner`: create contributors and payouts, activate and edit draft payouts, release milestones, refresh release proof, and retry failed releases; owners and reviewers can view all payouts.
- `reviewer`: approve or reject milestones; reviewers can view all payouts.
- `contributor`: submit milestones and view only payouts matched to the active user through the linked contributor user, recipient wallet, or contributor email.
- Contributor management requires the `owner` actor.

These are the permissions explicitly represented by `lib/runtime/product-policy.ts`. This document does not infer additional permissions from role names.

## Workspace scoping

Requests carry a workspace context, and repository operations receive the workspace ID when enforcing scope. Resource lookups and mutations reject or return no result for records belonging to another workspace, including contributor, payout, milestone, release, proof, and activity operations where the relevant repository check exists.

The request context resolver retains development/default fallbacks only when no session is present. For a verified session, `lib/auth/session-server.ts` requires a persisted `User` and `WorkspaceMember`; actor and user IDs are derived from the selected membership. A workspace selector is accepted only when it matches one of the user's memberships, and ambiguous multi-workspace sessions must select a workspace. Missing or unauthorized membership context returns `AUTH_CONTEXT_REQUIRED` (403).

The sole membership bootstrap is explicit first-workspace creation: `POST /api/v1/workspaces` requires a verified session user with no existing memberships, locks that user, and creates one new workspace plus an `owner` membership in one transaction. It cannot grant access to an existing workspace or add an owner role to a workspace selected by client input.

## Authentication and actor alignment

Protected API mutations require a valid `sf_session` cookie. `proxy.ts` verifies the signed session token and returns `401` with `AUTH_REQUIRED` for non-public API mutations without a valid session. Authentication endpoints remain open, and feedback endpoints are explicitly public mutations.

`buildProductContextFromMembership` derives the actor from the stored membership role and sets the active user ID to the authenticated user. `ops` maps to the `ops` product actor. Policy functions compare optional actor user IDs with `activeUserId`; mismatches produce a `403` policy violation. Settings updates additionally require the owner actor.

## Where decisions are enforced

- Session gate: `proxy.ts`.
- Session token creation and verification: `lib/auth/session.ts`.
- Membership-role mapping: `lib/auth/session-mapping.ts`.
- Product actor and context types/resolution: `lib/runtime/product-context.ts`, `lib/runtime/product-context-server.ts`.
- Operation policy checks and actor/user alignment: `lib/runtime/product-policy.ts`.
- Role hierarchy helpers: `lib/runtime/role-utils.ts`.
- Resource/workspace checks: relevant repository modules under `lib/repositories/` and protected handlers under `app/api/v1/`.

## Source of Truth

- Stored roles and workspace membership schema: `prisma/schema.prisma`.
- Runtime actor values and context shape: `lib/runtime/product-context.ts`.
- Role-to-actor mapping and authenticated membership context: `lib/auth/session-mapping.ts`.
- Operation permissions and alignment checks: `lib/runtime/product-policy.ts`.
- Role ordering helpers: `lib/runtime/role-utils.ts`.
- Session format, cookie, signing, and verification: `lib/auth/session.ts`.
- Request mutation gate: `proxy.ts`.
- Resource scope enforcement: the specific repository and `app/api/v1/` handler implementing each operation.

## Verification

Inspected files:

- `prisma/schema.prisma`
- `lib/runtime/product-context.ts`
- `lib/runtime/product-context-server.ts`
- `lib/auth/session-mapping.ts`
- `lib/auth/session.ts`
- `lib/runtime/product-policy.ts`
- `lib/runtime/role-utils.ts`
- `proxy.ts`
- relevant `app/api/v1/**` handlers
- relevant `lib/repositories/**` modules
