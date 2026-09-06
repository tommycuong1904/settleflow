# AUTHORIZATION

Status: current
SSoT: Current auth/session/policy implementation
Last verified: 2026-08

## Scope and terminology

- **Workspace membership role** is the role stored on `WorkspaceMember` in Prisma.
- **Product actor** is the three-value runtime identity used by product policy checks.
- **Permission** is an operation-specific result from an `assertCan...` policy function.
- **Workspace membership** links a user to a workspace and supplies the stored role used to derive the product actor.

The database role and runtime actor are intentionally not the same enum.

## Current roles and actor mapping

`WorkspaceMemberRole` currently contains four values:

`owner`, `ops`, `reviewer`, `contributor`.

`ProductActor` currently contains three values:

`owner`, `reviewer`, `contributor`.

The implemented mapping is:

| WorkspaceMemberRole | ProductActor | Meaning in current policy |
| --- | --- | --- |
| `owner` | `owner` | owner-level operations |
| `ops` | `owner` | owner-level operations; this is an explicit current mapping |
| `reviewer` | `reviewer` | review operations |
| `contributor` | `contributor` | submission and contributor-scoped viewing |

Unknown stored role strings are rejected by `mapMembershipRoleToActor`; they do not receive Owner-equivalent authority.

## Current actor permissions

The centralized policy functions currently enforce:

- `owner`: create contributors and payouts, activate and edit draft payouts, release milestones, refresh release proof, and retry failed releases; owners and reviewers can view all payouts.
- `reviewer`: approve or reject milestones; reviewers can view all payouts.
- `contributor`: submit milestones and view only payouts matched to the active user through the linked contributor user, recipient wallet, or contributor email.
- Contributor management permits the contributor creator to manage that record; otherwise it requires the `owner` actor.

These are the permissions explicitly represented by `lib/runtime/product-policy.ts`. This document does not infer additional permissions from role names.

## Workspace scoping

Requests carry a workspace context, and repository operations receive the workspace ID when enforcing scope. Resource lookups and mutations reject or return no result for records belonging to another workspace, including contributor, payout, milestone, release, proof, and activity operations where the relevant repository check exists.

The request context resolver retains development/default fallbacks only when no session is present. For a verified session, `lib/auth/session-server.ts` requires a persisted `User` and `WorkspaceMember`; actor and user IDs are derived from the selected membership. A workspace selector is accepted only when it matches one of the user's memberships, and ambiguous multi-workspace sessions must select a workspace. Missing or unauthorized membership context returns `AUTH_CONTEXT_REQUIRED` (403).

## Authentication and actor alignment

Protected API mutations require a valid `sf_session` cookie. `proxy.ts` verifies the signed session token and returns `401` with `AUTH_REQUIRED` for non-public API mutations without a valid session. Authentication endpoints remain open, and feedback endpoints are explicitly public mutations.

`buildProductContextFromMembership` derives the actor from the stored membership role and sets the active user ID to the authenticated user. `ops` continues to map to the `owner` product actor. Policy functions compare optional actor user IDs with `activeUserId`; mismatches produce a `403` policy violation. Settings updates additionally require the owner actor.

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
