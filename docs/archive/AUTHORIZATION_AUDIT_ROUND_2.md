> **Historical / Superseded — not current SSoT.**

# Authorization Audit Round 2 — Current Codebase

**Scope:** authorization/access control only. Audit performed without source, schema, or test modifications. No staging, commit, push, or deploy.

## 1. Executive verdict

**NOT PRODUCTION READY.** Phase 1 fixed the main session provisioning and actor-override issues, and payout detail now has a scoped query. However, the current codebase still has material authorization gaps:

- Contributor milestone submission still authorizes by wallet fallback and accepts a caller-supplied user ID.
- Multiple protected repositories fetch by ID first and authorize afterward.
- Several protected repository methods accept optional `workspaceId` and can execute unscoped.
- Activity, release, and several detail paths do not enforce Contributor assignment at database query time.
- `proxy.ts` still propagates client actor values; protected session-backed resolvers must continue to ignore them, and this boundary is fragile.
- Legacy `/api/**` parity with `/api/v1/**` is not proven.
- Multiple membership roles and `ops` semantics remain ambiguous.

**Counts:** P0: 4, P1: 12, P2: 6.

## 2. What is now secure

### Session and membership foundation

- **File:** `lib/auth/session-server.ts`
- Authenticated requests require a real verified session, a matching `User`, and a persisted `WorkspaceMember`.
- No automatic User provisioning, first-workspace assignment, or Owner assignment was observed in the current session resolver.
- Authenticated users without a User or membership fail closed rather than receiving demo access.

### Payout detail workspace boundary

- **Files:** `lib/repositories/payouts.ts`, `app/api/v1/payouts/[id]/route.ts`
- `getPayoutDetail(id, workspaceId)` uses a workspace-scoped `findFirst({ where: { id, workspaceId } })` query.
- Existing direct API coverage confirms a payout from another workspace is hidden.

### Payout listing/session tests

- **Files:** `app/api/v1/payouts/route.ts`, `lib/api/authorization-routes.test.mts`
- Tests cover unauthenticated access, missing User, missing membership, unauthorized workspace selector, and multi-workspace selector behavior.

### Owner milestone review policy

- **File:** `lib/runtime/product-policy.ts`
- Owner and Reviewer are allowed to approve/reject milestones.
- Contributor is denied.
- Existing milestone business-state validation remains separate from role authorization.

### Dashboard baseline

- **Files:** `lib/repositories/dashboard.ts`, `app/(app)/dashboard/page.tsx`
- Dashboard data now requires a workspace object and applies linked-user filtering for Contributor payout/contributor queries.
- This is not yet sufficient evidence that every dashboard-related read is isolated, because the legacy summary helper remains optional/unscoped.

## 3. Remaining P0

### P0-1 — Wallet address is an alternative milestone-submission identity

- **File/function:** `lib/repositories/milestone-submission.ts` — `submitMilestone`
- **Current behavior:** Fetches milestone by ID, checks workspace afterward, then authorizes with `matchesLinkedUserId || matchesWallet`.
- **Expected behavior:** Authorization must require the authenticated server principal to equal the Contributor's persisted `linkedUserId`; wallet is payment data, not identity.
- **Security impact:** A caller with a matching payout/target wallet can submit using a different User ID. The method also accepts `input.contributorUserId` from the caller.
- **Recommended fix:** Derive submitter User ID from the authenticated session in the route/service boundary; remove wallet fallback and body identity authority; query the assigned Contributor through workspace-scoped relations.

### P0-2 — Protected mutations still use ID-only initial lookups

- **Files/functions:** `lib/repositories/payout-editing.ts:updatePayoutDraft`; `payout-activation.ts`; `milestone-review.ts`; `milestone-release.ts`; `milestone-submission.ts`; `release-proof.ts`; `release-retry.ts`.
- **Current behavior:** `findUnique({ where: { id } })` or equivalent retrieves the object, followed by a workspace comparison.
- **Expected behavior:** `workspaceId` must be in the initial query boundary.
- **Security impact:** Violates the mandatory query-time isolation invariant and creates reusable IDOR-prone service methods. Future callers can accidentally return/mutate before the late check.
- **Recommended fix:** Require workspace ID in signatures and use relational scoped `findFirst`/`updateMany` or an equivalent transaction-safe scoped operation.

### P0-3 — Optional workspace scope remains on protected repositories

- **Files/functions:** `lib/repositories/payouts.ts`; `contributors.ts`; `releases.ts:getReleaseById`; `payout-activity.ts:getWorkspaceActivity`; `dashboard.ts:getDashboardSummary`.
- **Current behavior:** `workspaceId?: string` is accepted; absent values produce unscoped or partially scoped queries.
- **Expected behavior:** Protected production repository methods must fail closed when workspace context is absent.
- **Security impact:** Any legacy route or future caller can unintentionally enumerate or read cross-workspace data.
- **Recommended fix:** Make workspace scope mandatory for protected methods. Keep unscoped functions only for explicit non-request internal tooling.

### P0-4 — Caller-supplied contributor identity is used for mutation/audit

- **Files:** `app/api/v1/milestones/[id]/submit/route.ts`, `lib/repositories/milestone-submission.ts`.
- **Current behavior:** Route/repository passes `contributorUserId` from request/context input into submission creation and activity logging.
- **Expected behavior:** Actor identity must be the authenticated principal only.
- **Security impact:** Body/client identity manipulation can produce submissions attributed to another user, subject to the current linked/wallet checks.
- **Recommended fix:** Remove user identity from request payload; inject principal identity from session resolution and verify membership/assignment server-side.

## 4. Remaining P1

### P1-1 — Payout activity lacks role and Contributor scoping

- **Files:** `app/api/v1/payouts/[id]/activity/route.ts`, `lib/repositories/payout-activity.ts:getPayoutActivity`.
- **Current behavior:** Route first checks payout detail by workspace, then calls `getPayoutActivity(id)` with only payout ID.
- **Expected behavior:** Activity query must receive workspace, role, and principal identity; Contributor must see only assigned payout activity.
- **Security impact:** Repository is reusable without the preceding check and has no Contributor restriction.
- **Recommended fix:** Scope activity query by payout workspace and related Contributor `linkedUserId`; make authorization context mandatory.

### P1-2 — Workspace activity is not Contributor-filtered

- **File:** `lib/repositories/payout-activity.ts:getWorkspaceActivity`.
- **Current behavior:** Activity logs/proofs are filtered by workspace only; `workspaceId` is optional. Milestone title enrichment uses `where: { id: { in: milestoneIds } }`.
- **Expected behavior:** Contributor gets only own assigned payout/milestone/submission/proof activity; enrichment preserves workspace scope.
- **Security impact:** A Contributor page/caller can receive workspace-wide activity if invoked with workspace context only; absent scope can be worse.
- **Recommended fix:** Require `{ workspaceId, role, userId }`; use relational Contributor filtering and workspace-scoped milestone enrichment.

### P1-3 — Release detail is not role/assignment scoped

- **Files:** `app/api/v1/releases/[id]/route.ts`, `lib/repositories/releases.ts:getReleaseById`.
- **Current behavior:** Authenticated request resolves workspace ID, repository does ID-only `findUnique`, checks workspace afterward, and returns release plus proofs without role/Contributor filtering.
- **Expected behavior:** Owner sees workspace releases; Reviewer sees permitted workspace releases; Contributor sees only own settlement status.
- **Security impact:** A Contributor who knows a same-workspace release ID may receive release/proof details unrelated to their assignment.
- **Recommended fix:** Require full authorization context and query `release.id` with `payout.workspaceId` and, for Contributor, linked Contributor identity.

### P1-4 — Contributor list is optionally/unscoped and not role-aware

- **File:** `lib/repositories/contributors.ts:listContributors`.
- **Current behavior:** Input and `workspaceId` are optional; query can list all contributors in the runtime database. No role/principal input limits Contributor to their own linked profile.
- **Expected behavior:** Owner/Reviewer may list permitted workspace contributors; Contributor must see only their linked Contributor record, if that read is allowed.
- **Security impact:** Cross-workspace enumeration or Contributor exposure of other contributors.
- **Recommended fix:** Mandatory workspace/role/user context and linked-user relational filter.

### P1-5 — Contributor update/delete use late workspace checks

- **File/functions:** `lib/repositories/contributors.ts:updateContributor`, `getContributorOwnership`, `deleteContributor`.
- **Current behavior:** `findUnique({ id })` occurs before workspace comparison; workspace is optional; ownership helper has no workspace parameter.
- **Expected behavior:** Resource lookup must include workspace and mutation must require Owner membership.
- **Security impact:** IDOR-prone reusable methods and accidental cross-workspace operations.
- **Recommended fix:** Require workspace ID and query by `{ id, workspaceId }`; remove unscoped ownership helper for request paths.

### P1-6 — Payout status recalculation is ID-only

- **File:** `lib/repositories/payout-status.ts:recalculatePayoutStatus`.
- **Current behavior:** Reads and updates payout by `payoutId` only.
- **Expected behavior:** Internal helper must be explicitly scoped or callable only behind a proven scoped transaction boundary.
- **Security impact:** Future release/settlement caller can mutate another workspace payout by known ID.
- **Recommended fix:** Require workspace ID or make the helper private to a transaction that already loaded the scoped payout.

### P1-7 — Release proof refresh and retry have late scope checks

- **Files:** `lib/repositories/release-proof.ts`, `lib/repositories/release-retry.ts`.
- **Current behavior:** Fetch release by ID, then compare related payout workspace; role check follows.
- **Expected behavior:** Workspace must be in query; actor must be authenticated principal; role policy must be consistent.
- **Security impact:** Fragile IDOR boundary and inconsistent behavior if reused.
- **Recommended fix:** Scoped relational query and mandatory principal/workspace arguments.

### P1-8 — Milestone review/release paths use late scope checks

- **Files:** `lib/repositories/milestone-review.ts`, `lib/repositories/milestone-release.ts`.
- **Current behavior:** Milestone is loaded by ID before workspace check; reviewer/owner user IDs are passed to the repository.
- **Expected behavior:** Workspace-scoped query and principal-derived actor identity.
- **Security impact:** Known foreign milestone IDs can reach the service and authorization depends on later checks.
- **Recommended fix:** Scope query at time of fetch and remove caller authority over actor user ID.

### P1-9 — Legacy route authorization parity is unproven

- **Files:** `app/api/**` legacy routes, especially `app/api/payouts/**`, `app/api/contributors/route.ts`, `app/api/dashboard/route.ts`, `app/api/release/route.ts`.
- **Current behavior:** Legacy and `/api/v1/**` routes coexist and do not all visibly share identical repository/policy paths.
- **Expected behavior:** Legacy routes must be equal or stricter than v1 routes.
- **Security impact:** Attackers may use a weaker legacy route to bypass hardened v1 behavior.
- **Recommended fix:** Route-by-route parity audit and consolidation onto shared authorization services.

### P1-10 — `proxy.ts` still accepts/propagates actor values

- **File:** `proxy.ts`.
- **Current behavior:** Actor is read from request headers, cookies, and query parameters, then copied into request headers/response cookies.
- **Expected behavior:** Client actor values may be UI/demo hints only and must never enter authenticated authorization.
- **Security impact:** Fragile trust boundary; any route or helper that consumes propagated headers/cookies can be elevated.
- **Recommended fix:** Remove actor propagation for authenticated paths or mark it explicitly demo-only; enforce server context at every protected route.

### P1-11 — Workspace settings lookup is ID-only

- **File:** `lib/repositories/workspace-settings.ts`.
- **Current behavior:** Uses `db.workspace.findUnique` by workspace ID. Route-level context appears to supply the workspace, but repository does not itself require membership/principal.
- **Expected behavior:** Protected settings read/write must be called only with server-authorized workspace context and should not trust arbitrary workspace ID.
- **Security impact:** Reuse by a route/action can expose or mutate another workspace’s settings.
- **Recommended fix:** Require authorization context or make the repository accept only a previously authorized workspace identifier from a typed service boundary.

### P1-12 — Multiple roles create effective-role ambiguity

- **Files:** `prisma/schema.prisma`, `lib/auth/session-server.ts`, `lib/auth/session-mapping.ts`, `lib/repositories/permissions.ts`.
- **Current behavior:** Uniqueness is `(workspaceId, userId, role)`, so one user can have owner/reviewer/contributor rows in one workspace. Session resolution selects a membership/effective role rather than defining a complete multi-role policy.
- **Expected behavior:** Effective role must be deterministic and explicit.
- **Security impact:** Authorization may vary by membership ordering or layer; role switching/selection can produce inconsistent privileges.
- **Recommended fix:** Separate design decision: define role precedence or prohibit multiple effective roles in a separate schema change. Do not change schema in this audit.

## 5. Remaining P2

### P2-1 — `getDashboardSummary(workspaceId?)` remains optional

- **File:** `lib/repositories/dashboard.ts`.
- **Current behavior:** Legacy summary method accepts optional workspace ID.
- **Expected behavior:** Protected summary must require authorized workspace and role/principal.
- **Security impact:** Potential unscoped aggregate disclosure.
- **Recommended fix:** Mandatory scoped API or isolate to non-request fixture code.

### P2-2 — Client product context is still actor-configurable

- **File:** `lib/runtime/product-context-client.ts`.
- **Current behavior:** Actor is derived from cookie/query/default context.
- **Expected behavior:** Client context is presentation only and cannot authorize server operations.
- **Security impact:** Future server misuse can reintroduce escalation.
- **Recommended fix:** Separate client display role from server authorization type and add a hard boundary.

### P2-3 — Direct feedback route trusts submitted role/email metadata

- **File:** `app/api/v1/feedback/route.ts`.
- **Current behavior:** Stores `role`, `userEmail`, and `userAddress` supplied by request body.
- **Expected behavior:** If feedback is security-sensitive or workspace-owned, identity/role must come from session; otherwise it must be explicitly treated as untrusted metadata.
- **Security impact:** Spoofed audit/support metadata; potentially misleading operational records.
- **Recommended fix:** Derive authenticated metadata server-side or label fields as untrusted and keep them outside authorization.

### P2-4 — User existence checks are not membership checks

- **Files:** `milestone-submission.ts`, `milestone-review.ts`, `payout-creation.ts`, `payout-activation.ts`.
- **Current behavior:** Several paths first check `User` existence, then separately check role or assignment.
- **Expected behavior:** Principal identity and workspace membership should be one authorization boundary.
- **Security impact:** A valid User ID is not proof of workspace authority; separation is fragile when callers control the ID.
- **Recommended fix:** Derive identity from session and use workspace membership/linked identity queries directly.

### P2-5 — Nested latest-release/proof queries are not workspace-constrained

- **Files:** `lib/repositories/release-proof.ts`, `release-retry.ts`.
- **Current behavior:** `findFirst({ where: { milestoneId }, orderBy... })` and similar nested lookups omit workspace.
- **Expected behavior:** Nested resource queries preserve parent workspace scope.
- **Security impact:** Defense-in-depth gap and risk if IDs are reused or parent relationship is not guaranteed.
- **Recommended fix:** Add payout workspace relation to every nested query.

### P2-6 — Export coverage is not defined

- **Files/routes:** no dedicated export route was identified in route inventory.
- **Current behavior:** No explicit export authorization matrix exists.
- **Expected behavior:** Any future export must use the same workspace/role/Contributor filters as reads.
- **Security impact:** A new export endpoint could bypass read restrictions.
- **Recommended fix:** Add export to the authorization contract and tests before implementation.

## 6. Resource authorization matrix

| Resource | Owner | Reviewer | Contributor | Workspace query | Contributor query | Status |
|---|---|---|---|---|---|---|
| Workspace | full intended access | permitted reads only | no management | context-based | n/a | Partial; repository boundary requires review |
| WorkspaceMember | manage | denied | denied | route/context | n/a | Partial; multi-role ambiguity |
| Contributor | CRUD/manage | read if permitted | own linked read only | inconsistent/optional | missing in list path | Unsafe |
| Payout | CRUD/activate/delete/view/release | permitted read only | assigned read only | list/detail improved; mutations late-scope | partial | Unsafe |
| Milestone | approve/reject/release/read | approve/reject/read | assigned read/submit | many ID-only fetches | submission unsafe wallet fallback | Unsafe |
| Submission | workspace view | permitted payout view | own only | parent scope partial | identity/body trust issue | Unsafe |
| Review | approve/reject/comment | approve/reject/comment | own feedback only | parent scope partial | direct matrix incomplete | Partial |
| Release | release/retry/refresh/read | refresh/read as product policy permits | own status only | read late-scope | missing | Unsafe |
| TransactionProof | workspace view/refresh | permitted refresh/read | own status only | parent scope partial | missing | Unsafe |
| ActivityLog | workspace view | permitted workspace view | assigned payout only | optional workspace | missing | Unsafe |
| Workspace settings/policies | manage | read if allowed | denied | route-dependent | n/a | Partial |
| Feedback | submit | submit | submit | not clearly workspace-owned | n/a | Metadata spoofing risk |

No dedicated export path was identified.

## 7. Route/API authorization matrix

Legend: **Y** = intended/partly enforced; **N** = denied; **P** = partial/unsafe; **T** = direct tests present; **—** = not applicable.

| Route/action | Owner | Reviewer | Contributor | Workspace scoped | Contributor scoped | Tests |
|---|---:|---:|---:|---:|---:|---:|
| `GET /api/v1/payouts` | Y | Y | P | Y | P | T |
| `POST /api/v1/payouts` | Y | N | N | P | — | P |
| `GET /api/v1/payouts/[id]` | Y | Y | P | Y | P | T |
| `PUT/PATCH /api/v1/payouts/[id]` | Y | N | N | P | — | P |
| `POST /api/v1/payouts/[id]/activate` | Y | N | N | P | — | P |
| `GET /api/v1/payouts/[id]/activity` | Y | P | P | P | N | N |
| `POST /api/v1/milestones/[id]/approve` | Y | Y | N | P | — | P |
| `POST /api/v1/milestones/[id]/reject` | Y | Y | N | P | — | P |
| `POST /api/v1/milestones/[id]/submit` | N | N | P | P | P | N |
| `POST /api/v1/milestones/[id]/release` | Y | N | N | P | — | P |
| `GET /api/v1/releases/[id]` | Y | P | P | P | N | N |
| `POST /api/v1/releases/[id]/proof/refresh` | Y/ops | P | N | P | — | P |
| `POST /api/v1/releases/[id]/retry` | Y/ops | N | N | P | — | P |
| `GET /api/v1/contributors` | Y | P | P | P | N | P |
| `POST /api/v1/contributors` | Y | N | N | P | — | P |
| `GET/PUT/DELETE /api/v1/contributors/[id]` | Y/P | N/P | N/P | P | — | P |
| `GET/PUT /api/v1/settings` | Y/ops | N | N | Y/P | — | T |
| `POST /api/v1/webhooks/test` | Y/ops | N | N | P | — | N |
| Legacy `/api/payouts/**` | P | P | P | P | P | P |
| Legacy `/api/contributors` | P | P | P | P | P | P |
| Legacy `/api/dashboard` | P | P | P | P | P | P |
| Legacy `/api/release` | P | P | P | P | P | P |
| `/api/v1/feedback` | submit | submit | submit | unclear | n/a | P |

The matrix reflects the requested model; `P` means the route has some checks but the audit found a repository, identity, or isolation gap.

## 8. Contributor isolation audit

### Dashboard

- **Flow:** `app/(app)/dashboard/page.tsx` → `resolveProductContextFromCookiesWithSession` → `getDashboardData({ workspaceId, role, userId })` → payout/contributor DB queries.
- **Finding:** Payout and contributor queries use linked-user filtering for Contributor. However, dashboard summary helper remains optional/unscoped and milestone/proof read semantics require broader integration tests.
- **Status:** Partial.

### Payout list

- **Flow:** API route → session context → payout repository.
- **Finding:** Workspace scope exists, but Contributor assignment filtering must be verified for both v1 and legacy route paths.
- **Status:** Partial.

### Payout detail

- **Flow:** page/API → session context → `getPayoutDetail(id, workspaceId)`.
- **Finding:** Workspace ID is in the database query. Contributor assignment is not proven in the repository contract.
- **Status:** Workspace-safe, Contributor-incomplete.

### Milestones

- **Flow:** milestone route → session context → milestone repository.
- **Finding:** Several repositories fetch milestone by ID first; submission additionally accepts wallet authorization.
- **Status:** Unsafe.

### Submissions

- **Finding:** Caller-supplied `contributorUserId` and wallet fallback violate principal/linked identity rules.
- **Status:** P0 blocker.

### Activity

- **Finding:** Payout activity receives only payout ID; workspace activity is workspace-only and optional. Contributor A can potentially receive B activity when a broad activity path is used.
- **Status:** Unsafe.

### Transaction proof/settlement

- **Finding:** Release GET returns release/proofs after workspace-only filtering and has no Contributor assignment filter. Proof refresh/retry use late workspace lookup.
- **Status:** Unsafe.

Conceptual attacks that remain insufficiently protected by current contracts:

- Contributor A → B payout: workspace may block foreign workspace; same-workspace assignment isolation is not proven.
- Contributor A → B milestone: ID-only lookup and submission identity flaws.
- Contributor A → B activity: activity repository lacks role/principal filter.
- Contributor A → B submission: submission path trusts caller identity/wallet fallback.
- Contributor A → B proof: release/proof read path lacks Contributor assignment filter.

## 9. Cross-workspace/IDOR audit

| Resource | Foreign read by known ID | Foreign update | Foreign delete | Nested escape risk | Finding |
|---|---|---|---|---|---|
| Contributor | possible through unscoped helper | late workspace check | late workspace check | payout count uses contributor ID only | P1 |
| Payout | detail protected; other helpers ID-only | late checks in edit/activate | route parity incomplete | milestone/release nested paths | P0/P1 |
| Milestone | route/repository ID-only patterns | review/release late scope | n/a | payout parent scope must be in query | P1 |
| Submission | no dedicated audited read route; creation identity unsafe | creation unsafe | n/a | milestone parent ID-only | P0 |
| Review | milestone parent ID-only | late scope | n/a | milestone parent | P1 |
| Release | workspace check after ID-only fetch | retry/refresh late scope | n/a | latest release by milestone only | P1 |
| TransactionProof | returned through release/activity without role filter | refresh parent late scope | n/a | release/milestone nesting | P1 |
| ActivityLog | workspace optional; payout activity ID-only | append actor supplied by service input | n/a | milestone enrichment ID-only | P1 |
| WorkspaceMember | membership selection ambiguity | route parity not fully proven | route parity not fully proven | multiple roles | P1 |
| Workspace settings | repository workspace ID-only | route-dependent | n/a | workspace ID authority | P1/P2 |

A foreign workspace ID should generally result in a 404 for resource reads and a 403/404 according to route convention for mutations. Current payout detail meets the preferred 404 behavior; many other paths rely on late checks.

## 10. Multi-role analysis

### Schema behavior

`WorkspaceMember` uniqueness is `(workspaceId, userId, role)`, not `(workspaceId, userId)`. Therefore one user can have multiple roles in one workspace.

### Resolution behavior

- `lib/auth/session-server.ts` resolves memberships and selects an effective membership/context.
- `lib/auth/session-mapping.ts` maps `owner` and `ops` to Owner actor.
- `lib/repositories/permissions.ts` checks raw membership roles.
- No single explicit precedence policy was found that defines how simultaneous Owner/Reviewer/Contributor rows are combined.

### Security implications

- Effective role can become ordering/layer dependent.
- A user can appear as Owner in policy context while another repository sees a different raw role.
- Role switching or selecting a membership context can create inconsistent UI/API decisions.
- A Contributor row does not itself grant escalation, but a concurrent Owner/ops row grants Owner-level access under current compatibility behavior.

**No schema change is recommended in this audit.** A separate design decision is required.

## 11. ops role analysis

Observed references:

- `prisma/schema.prisma`: enum value `ops`.
- `lib/auth/session-mapping.ts`: `ops` maps to Owner actor.
- `lib/repositories/permissions.ts`: accepts raw `ops` role.
- `lib/repositories/payout-creation.ts`: `owner`, `ops` allowed.
- `lib/repositories/payout-activation.ts`: `owner`, `ops` allowed.
- `lib/repositories/release-proof.ts`: `owner`, `ops` allowed.
- `lib/repositories/release-retry.ts`: `owner`, `ops` allowed.
- `lib/repositories/milestone-release.ts`: `owner`, `ops` allowed.
- `lib/repositories/milestone-review.ts`: `owner`, `ops`, `reviewer` allowed.

### Effective permissions

`ops` behaves like Owner in payout creation/activation, release, retry, proof refresh, and milestone review. Session mapping also presents it as Owner.

### Inconsistencies and impact

- Finalized product model names Owner/Reviewer/Contributor, while raw repository checks retain `ops`.
- Some layers compare normalized actor `owner`; others compare raw membership `ops`.
- Future code can accidentally omit `ops` or grant it Reviewer-only behavior.
- Multiple roles amplify the ambiguity.

Do not change `ops` in this audit. Treat it as temporary Owner-equivalent compatibility and add explicit tests before any redesign.

## 12. Authentication failure-mode audit

| Failure mode | Current assessment |
|---|---|
| Unauthenticated request | Protected v1 routes generally return 401 via `getSessionFromRequest`; route parity still needs verification |
| Authenticated but no User | Fails closed; existing tests cover payout/settings cases |
| Authenticated User without membership | Fails closed; existing tests cover payout cases |
| Insufficient permission | Policy/repository checks exist for core payout/milestone mutations; direct full matrix incomplete |
| Foreign workspace resource | Payout detail returns 404; many other resources late-check after ID fetch |
| Demo fallback in protected path | Session-backed resolver was hardened; client/default context remains a fragile boundary |
| Forged actor query/cookie/header | Authenticated resolver ignores overrides, but `proxy.ts` still propagates values and legacy parity is not proven |
| Email-based role inference | Removed from session authorization foundation; feedback/authentication fields still carry email metadata, not sufficient authorization proof |
| Body `userId` authority | Still present in milestone submission and repository actor inputs |
| Wallet-as-user identity | Still present in milestone submission wallet fallback |

## 13. Missing regression tests

No tests were written during this audit. The following are missing or incomplete:

- Full Owner/Reviewer/Contributor direct API matrix for every protected route.
- Contributor A versus B payout, milestone, submission, activity, proof, and settlement reads.
- Foreign-ID tests for Contributor, Milestone, Submission, Review, Release, TransactionProof, ActivityLog, WorkspaceMember, and settings.
- ID-only repository lookup regression tests asserting workspace is part of the query.
- Body `userId`/`contributorUserId` manipulation tests.
- Wallet match with wrong linked User tests.
- Actor query/cookie/header manipulation across legacy and v1 routes.
- No-membership 403 tests for every protected route, not only payout/settings.
- Release/proof role-specific read tests.
- Activity Contributor filtering tests.
- Legacy route parity tests.
- Multiple roles in one workspace deterministic-resolution tests.
- `ops` tests for every Owner-equivalent repository path.
- Reviewer denial tests for payout creation/edit/activation/release and member/contributor management.
- Contributor denial tests for create/edit/approve/release/member management.
- Business-state validation tests combined with Owner authorization.

## 14. Exact files/functions/routes requiring fixes

1. `lib/repositories/milestone-submission.ts:submitMilestone`
2. `app/api/v1/milestones/[id]/submit/route.ts`
3. `lib/repositories/payout-activity.ts:getPayoutActivity`
4. `lib/repositories/payout-activity.ts:getWorkspaceActivity`
5. `app/api/v1/payouts/[id]/activity/route.ts`
6. `lib/repositories/releases.ts:getReleaseById`
7. `app/api/v1/releases/[id]/route.ts`
8. `lib/repositories/contributors.ts:listContributors`
9. `lib/repositories/contributors.ts:updateContributor`
10. `lib/repositories/contributors.ts:getContributorOwnership`
11. `lib/repositories/contributors.ts:deleteContributor`
12. `lib/repositories/payout-editing.ts:updatePayoutDraft`
13. `lib/repositories/payout-activation.ts`
14. `lib/repositories/milestone-review.ts`
15. `lib/repositories/milestone-release.ts`
16. `lib/repositories/release-proof.ts`
17. `lib/repositories/release-retry.ts`
18. `lib/repositories/payout-status.ts:recalculatePayoutStatus`
19. `lib/repositories/dashboard.ts:getDashboardSummary`
20. `lib/repositories/workspace-settings.ts`
21. `proxy.ts`
22. All legacy routes under `app/api/**`, especially payout/contributor/dashboard/release routes.

## 15. Recommended fix order

1. Remove wallet fallback and all caller-supplied principal identity from milestone submission.
2. Make workspace ID mandatory for protected repository methods.
3. Convert all protected ID-only lookups to workspace-scoped queries.
4. Add role/principal-aware Contributor filtering to payout detail, release, activity, dashboard, and contributor reads.
5. Harden release/proof/retry and milestone review/release nested queries.
6. Restrict or scope payout-status recalculation.
7. Audit legacy route parity and remove weaker authorization paths.
8. Establish an explicit `ops` compatibility contract and test it.
9. Decide multi-role semantics separately; only then consider schema changes.
10. Add the missing direct API, IDOR, identity-manipulation, and Contributor isolation tests.

## Final verdict

**Authorization Audit Round 2 verdict: NOT PRODUCTION READY**

### Blockers

- Wallet-based milestone submission authorization.
- Caller-supplied User ID used for Contributor mutation/audit identity.
- Unscoped/late-scoped protected repository access.
- Missing Contributor filtering for activity, release/proof, and several read paths.
- Unproven legacy-route authorization parity.

The report was generated from the current repository state and saved without modifying source code or Prisma schema.

## Audit metadata

- Report path: `/root/settleflow/docs/AUTHORIZATION_AUDIT_ROUND_2.md`
- Source code modified by this audit: no
- Prisma schema modified by this audit: no
- Tests written by this audit: no
- Git stage/commit/push/deploy: no
- Previous verification baseline supplied by requester: 144/144 tests, TypeScript PASS, Build PASS

## Findings count

- P0: 4
- P1: 12
- P2: 6
- Verdict: NOT PRODUCTION READY
