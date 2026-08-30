# SECURITY INVARIANTS

Status: current
SSoT: Current security-relevant implementation
Last verified: 2026-08

This document records security and integrity properties demonstrated by the current implementation. It does not claim that the application is production-complete.

## Anonymous mutation blocking

### Invariant
Non-public API mutations must have a valid signed session.

### Why it matters
It prevents unauthenticated callers from invoking protected payout, contributor, milestone, release, or settings mutations.

### Enforcement
`proxy` checks mutation methods under `/api/`, permits auth endpoints and feedback exceptions, verifies `sf_session`, and returns `401` with `AUTH_REQUIRED` when verification fails.

### Evidence
`proxy.ts`: `MUTATION_METHODS`, `OPEN_AUTH_PREFIXES`, `PUBLIC_MUTATION_PREFIXES`, `verifySessionToken`, `unauthorizedResponse`.

### Status
Implemented

## Session authentication

### Invariant
The session cookie is signed and must be valid and unexpired before it is accepted.

After verification, protected handlers must resolve the session to a persisted user and workspace membership. No seeded/default user or membership is created for an authenticated request. Workspace selectors are authorization-checked against all memberships; missing, ambiguous, or unauthorized context fails with `AUTH_CONTEXT_REQUIRED` (403).

### Why it matters
It prevents callers from treating an arbitrary cookie value as an authenticated identity.

### Enforcement
`createSessionToken` signs the payload with HMAC-SHA256; `verifySessionToken` verifies the signature and expiration. The cookie is `HttpOnly` and uses secure transport in production.

### Evidence
`lib/auth/session.ts`: `createSessionToken`, `verifySessionToken`, `SESSION_COOKIE_OPTIONS`, `getSessionSecret`.

### Status
Partially implemented

## Actor/user alignment

### Invariant
When a route supplies an actor user ID, it must match the authenticated active user ID.

### Why it matters
It prevents a signed-in user from presenting another user’s actor identity in a mutation request.

### Enforcement
`assertActorUserAlignment` returns a `403` violation on mismatch. Membership context assigns the authenticated user as the active user for the mapped actor.

### Evidence
`lib/runtime/product-policy.ts`: `assertActorUserAlignment`; `lib/auth/session-mapping.ts`: `buildProductContextFromMembership`.

### Status
Implemented

## Workspace scoping

### Invariant
A resource read or mutation must operate only within the requested workspace.

### Why it matters
It prevents cross-workspace data access and cross-tenant mutations.

### Enforcement
Repositories receive workspace IDs and compare resource ownership, returning no result or throwing `WORKSPACE_SCOPE_MISMATCH` as appropriate. Protected handlers pass the product-context workspace ID.

### Evidence
`lib/repositories/payouts.ts`, `contributors.ts`, `milestone-review.ts`, `release-proof.ts`, `release-retry.ts`, `payout-activation.ts`; relevant `app/api/v1/**` handlers.

### Status
Implemented

## Wallet validation

### Invariant
Contributor wallet addresses accepted by contributor create/update paths must be valid EVM addresses.

### Why it matters
It prevents malformed destinations from entering payout data and later release flows.

### Enforcement
Contributor repository create and update paths call `isValidEvmAddress` and reject invalid input.

### Evidence
`lib/repositories/contributors.ts`: `isValidEvmAddress` checks in `createContributor` and `updateContributor`; `app/api/v1/auth/wallet/route.ts`: `isAddress` validation.

### Status
Implemented

## Duplicate-wallet protection

### Invariant
A workspace must not contain two contributors with the same wallet address, compared case-insensitively.

### Why it matters
It reduces ambiguity about payout ownership and prevents accidental duplicate recipient records.

### Enforcement
Contributor create and wallet-update paths query the same workspace with a case-insensitive wallet comparison and reject duplicates.

### Evidence
`lib/repositories/contributors.ts`: duplicate checks in `createContributor` and `updateContributor`.

### Status
Implemented

## Server-only private key handling

### Invariant
The server signing key must be read only from the server-side `ARC_SERVER_PRIVATE_KEY` environment variable and must not be exposed as a public client variable.

### Why it matters
Exposure would allow unauthorized signing and loss of funds.

### Enforcement
The circle-wallet executor reads `process.env.ARC_SERVER_PRIVATE_KEY`; browser-wallet execution fails explicitly in the server executor. No claim is made here about deployment secret configuration.

### Evidence
`lib/arc/release-executor.ts`: `executeCircleWallet`, `ARC_SERVER_PRIVATE_KEY`, `executeBrowserWallet`; `docs/ARCHITECTURE.md` security boundary.

### Status
Partially implemented

## Operation-level authorization

### Invariant
Protected workflow operations must pass the actor-specific policy check before repository mutation.

### Why it matters
It prevents contributors, reviewers, or mismatched users from invoking owner-only or role-specific actions.

### Enforcement
`assertCan...` functions return explicit `403` violations; protected `app/api/v1/` handlers invoke these checks and map violations to responses.

### Evidence
`lib/runtime/product-policy.ts`; protected handlers for payouts, milestones, releases, contributors, and settings under `app/api/v1/`.

### Status
Implemented

## API mutation boundaries

### Invariant
Client request bodies must not be the sole authority for authenticated actor identity or workspace authorization.

### Why it matters
Client-controlled identity fields can otherwise be altered to bypass policy or cross workspace boundaries.

### Enforcement
The proxy session gate, request-derived product context, policy alignment checks, and repository workspace checks form the current boundary. Some context values are transported through headers/cookies/query parameters, so the route/session path remains part of the security boundary.

### Evidence
`proxy.ts`; `lib/runtime/product-context-server.ts`; `lib/auth/session-mapping.ts`; `lib/runtime/product-policy.ts`; relevant `app/api/v1/**` handlers.

### Status
Partially implemented

## Not verified

The following are not established by this document: deployment secret rotation, comprehensive route-level/E2E authorization coverage, database-level tenant isolation policies, rate limiting, CSRF defenses beyond cookie same-site settings, and production operational controls for live payments.

## Verification

Inspected implementation sources include `proxy.ts`, `lib/auth/session.ts`, `lib/auth/session-mapping.ts`, `lib/runtime/product-context.ts`, `lib/runtime/product-context-server.ts`, `lib/runtime/product-policy.ts`, `lib/runtime/role-utils.ts`, `lib/arc/release-executor.ts`, `app/api/v1/**`, `lib/repositories/**`, and `prisma/schema.prisma`.
