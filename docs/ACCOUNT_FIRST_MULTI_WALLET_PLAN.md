# Account-first, multi-wallet implementation plan

## Decision

SettleFlow treats Google/Circle and Web3 sign-in as independent `User`
identities. A Circle smart-contract account and a MetaMask EOA are distinct
on-chain accounts with distinct product access by default. Workspace
membership, contributor links, payout visibility, and authorization use the
persisted `User.id`, never a display-form wallet address.

This deliberately does **not** claim that a Circle User-Controlled smart wallet
and an imported MetaMask EOA are the same on-chain account. They have separate
keys and addresses. A release must state the actual source wallet and signing
path used.

## Current constraints to preserve

- Google Identity Services popup remains the primary Google sign-in path; the
  OAuth callback remains an explicit fallback.
- A verified sign-in may bootstrap a new user's own workspace only. It must
  not grant membership in an existing workspace.
- `WorkspaceMember(workspaceId, userId)` remains the single-role authorization
  invariant.
- Circle confirmation and settlement remain persisted, idempotent, and
  fail-closed. Browser-wallet submissions stay locked for reconciliation if
  the browser may already have broadcast a transaction.
- No client-provided address, email, or workspace id is authority by itself.

## Target data model

### 1. Add a canonical wallet-link table

Add `UserWallet` with:

| Field | Purpose |
| --- | --- |
| `id`, `userId` | Stable link to the account identity |
| `address` | Canonical EVM address, checksummed for display and normalized for matching |
| `kind` | `web3_eoa`, `circle_sca`, or temporary `legacy_export_eoa` |
| `authEnabled` | Whether this wallet may establish a Web3 session |
| `transactionEnabled` | Whether it is eligible as a release source for its supported signing path |
| `verifiedAt`, `createdAt`, `updatedAt` | Link provenance and auditability |

Enforce one normalized EVM address globally. Add an index by `userId`. Retain
`User.walletAddress` only during compatibility migration; new authorization
must not rely on it. `CircleUserWallet` is either folded into `UserWallet` with
Circle-specific metadata retained separately, or kept as Circle provisioning
state with a required one-to-one `UserWallet` reference. Choose the latter if
it makes Circle reconciliation simpler.

### 2. Snapshot release source identity

Future `Release` records must store `sourceWalletId` as well as the immutable
source address, execution mode, and signing path. A linked wallet may not be
unlinked while a release that references it is queued or awaiting settlement.

## Safe migration and rollout

1. Add additive schema and isolated-PostgreSQL migration tests first. No
   existing membership, payout, contributor, or transaction proof is changed.
2. Backfill each non-null `User.walletAddress` as `legacy_export_eoa` only
   when it has a unique normalized address. Backfill every valid
   `CircleUserWallet` as `circle_sca` for its same user.
3. Before enforcing global uniqueness, report and abort on any normalized
   address attached to more than one user. Do not select a winner, merge users,
   delete a wallet, or change a workspace role automatically.
4. Retire every backfilled `legacy_export_eoa` link by disabling its login and
   transaction capabilities. Keep its record only for historical references;
   do not reassign or merge it.
5. Switch all session and release reads to `UserWallet`; remove the legacy
   column only after a separately approved destructive migration.

## Authentication and account linking

### Google / Circle path

- Google token verification resolves the existing `User` by `googleSub`.
- Circle creates or retrieves its user-controlled wallet using that stable
  `User.id`; the server obtains the user token and Circle SDK completes the
  confirmation UI and PIN flow.
- The server records only Circle's returned non-secret wallet identifiers and
  address. A browser must never nominate an address to be linked as a Circle
  wallet.
- Google sessions can release only through the linked `circle_sca` path.

### Web3 path

- A Web3 login proves control of the exact selected address through the
  existing nonce/message/signature challenge.
- Resolve that normalized address through `UserWallet`. If linked, issue a
  session for its owner and include the verified `walletId` in the signed
  session payload.
- If no link exists, create a new Web3 account and bootstrap its own
  workspace. A signed-in account may instead run an explicit **Link MetaMask
  wallet** ceremony only before that address has ever been registered.
- Linking requires both the current authenticated session and a fresh nonce
  signature by the exact address being linked. Reject every address already
  present in `UserWallet`, including one owned by the current user. Never infer
  linkage from an email, a matching label, or deterministic address derivation.

### Legacy private-key export

The deterministic export flow is retired. It created an EOA that was not the
Circle SCA and made two accounts appear equivalent. Its UI and server exposure
are removed; historical links remain disabled only to preserve referenced data.

## Session and authorization changes

1. Extend the signed session payload with optional `walletId` and preserve the
   `authType` as provenance, not as product authorization.
2. `getVerifiedSessionUser` must validate a Web3 session against the linked
   `UserWallet`, not `User.walletAddress`. Google continues to validate its
   verified Google identity.
3. Product context resolves memberships exclusively from `User.id`; selected
   workspace is permitted only when the user has the persisted membership.
4. Contributor and payout visibility link to the user/account relationship,
   not whichever wallet happens to be displayed in the header.
5. Every server mutation derives both the account identity and, where needed,
   the eligible source wallet from the verified session plus database state.

## Release behavior

### Source selection

| Signed-in method | Allowed release source | Confirmation |
| --- | --- | --- |
| Google | Linked Circle SCA | Circle SDK confirmation UI and user PIN |
| Web3 | The session-linked EOA | Selected EIP-6963 provider / wallet signature |

The release screen must display source wallet type, address, network, and
confirmation method before submission. Recipient wallets are independent from
the payer's login method.

### Failure handling

- Before a browser transaction is broadcast, mark the queued release failed
  with a safe retry reason.
- If the provider may have broadcast but no hash is available, retain pending
  reconciliation and disable retry. Do not create a second payment attempt.
- A confirmed on-chain transaction must match the persisted release source,
  destination, token, amount, and chain before proof is attached.
- Circle challenges and transaction status are reconciled server-side from the
  release snapshot; browser state is only a presentation aid.

## UI work

1. Add a **Login methods and wallets** section in Settings:
   Google identity, Circle smart wallet, linked Web3 EOAs, verification state,
   and allowed capabilities.
2. Add an explicit **Link MetaMask wallet** flow from an authenticated account.
   It must show the selected address before the signature request.
3. Replace generic “connected wallet” copy with the current login identity and
   an explicit transaction-source wallet when a release is actionable.
4. Prevent unlinking the final usable login path or a wallet referenced by an
   in-flight release. Destructive unlink requires clear confirmation.
5. Show legacy exported EOA separately and never label it as the Circle smart
   wallet.

## Test and verification plan

### Database and migration tests

- Backfill valid legacy EOAs and Circle SCAs without altering memberships.
- Fail with a clear diagnostic for a normalized-address collision across users.
- Enforce one normalized address per `UserWallet` and allow many wallets for
  one user.
- Verify release `sourceWalletId` integrity and the unlink guard.

### Auth and authorization tests

- Same Web3 EOA cannot be linked to two users.
- A Google-authenticated user can link only after a fresh signature from the
  selected EOA.
- A linked EOA Web3 session resolves to its explicitly linked `User` only.
- An unlinked EOA creates a separate account and never joins a Google/Circle
  account by guesswork or deterministic derivation.
- Case differences in the same EVM address resolve to one canonical link.

### Release tests

- Google/Circle release selects the saved Circle SCA and is idempotent across
  refreshes.
- Web3 release rejects an account switch or source-address mismatch before
  broadcast.
- Cancellation, unknown submission, confirmed success, and reverted failure
  follow the persisted release state machine without duplicate release rows.
- A transaction proof is rejected when source, destination, token, amount, or
  chain differs from the release snapshot.

Run Prisma migrations against isolated PostgreSQL, then typecheck, lint, unit
tests, DB integration tests, and the production build. Browser E2E and real
Arc transactions remain outside this implementation plan until separately
authorized.

## Delivery slices

1. **Schema and migration safety — completed in development** — `UserWallet`,
   conflict-failing backfill, Circle source-wallet links, isolated migration
   verification, and DB integrity coverage are implemented.
2. **Identity resolution — completed in development** — Google/Circle and
   Web3 sign-in are independent by default. Web3 sessions resolve
   through a signed `UserWallet`; `POST /api/v1/auth/wallet/link` requires the
   existing session and a fresh wallet signature, with focused DB integration
   coverage. UI account management remains in the next slice.
3. **Product UI — partially implemented** — Settings is available to every
   authenticated workspace member for personal account management; owner-only
   invitations remain gated. The Link MetaMask action uses the secure link API.
   The inventory identifies Circle wallets and retired historical EOA links.
4. **Release enforcement — completed in development** — Google releases use
   the linked Circle SCA; browser releases require the enabled EOA in the
   signed Web3 session, snapshot that wallet, and reject a mismatched on-chain
   source during proof refresh. Focused route and verifier coverage passes.
5. **Cutover — partially completed in development** — runtime authentication
  and account linking now resolve only through `UserWallet`; the legacy
  `User.walletAddress` column is retained unused until production migration
  preflight and a separate destructive-column-removal approval. Deterministic
   key export remains a separately approved deprecation decision.

Each slice is independently commit-ready and must not submit a real Arc
transaction. Deployment migration and production-data remediation require a
separate operational approval.

## Definition of done

- Google/Circle and independent Web3 accounts never share workspace access
  unless an explicit, new-wallet link is completed before that address is
  registered.
- Google payments use the Circle SCA; Web3 payments use the linked EOA; the
  interface makes the distinction unambiguous.
- No address can silently attach to another account, and no wallet can be
  linked to multiple users.
- Workspace roles and contributor/payout access remain account-based.
- Release source, proof, retry, and reconciliation are durable and testable.
- Legacy export is either safely isolated as temporary compatibility or removed
  only through an approved migration path.
