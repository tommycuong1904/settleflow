# Testnet Web2-First Payment Plan

Status: active

## Objective

Deliver one simple payment experience for Google and Web3 sign-in users: they manage work, recipient, amount, and approval; SettleFlow manages wallet infrastructure, Arc Testnet submission, and reconciliation in the background. All payment acceptance evidence in this plan is a real Arc Testnet transaction. Mock and simulated payments are not acceptance evidence.

## Product decisions

- The default product experience is Web2-first for every user, including browser-wallet sign-in users.
- Normal Owner UI must never require chain IDs, RPCs, wallet accounts, transaction hashes, explorers, reconciliation, or duplicate-payment recovery.
- A payment has only user-facing states: `Ready to pay`, `Processing`, `Paid`, and `Payment needs support`.
- `Processing` payments reconcile automatically on the server. Owners never enter hashes, self-declare failure, or decide if retry is safe.
- Owner and Contributor remain the only active workspace roles. The server remains authoritative for membership, scope, approvals, sequencing, and payment permission.
- A Contributor destination is a verified profile address with an explicit workspace override. An Owner-entered address is temporary internal recovery, never normal onboarding.
- Browser-wallet execution/reconciliation remains a technical fallback until a managed rail is verified. Remove it from normal UI; do not delete it before replacement is operational.
- The recommended payment account is a user-controlled embedded wallet. Circle user-controlled wallets are the first candidate because a partial integration exists; provider terms and Testnet configuration require approval. SettleFlow never creates or retains user private keys.
- Testnet uses isolated credentials, wallets, database, and funding. Production is out of scope.

## Autonomous execution rule

The agent completes bounded engineering tasks in a phase without waiting for another message. Stop only for external configuration/signing/funding, explicit Testnet broadcast approval, or a material product/provider decision.

- One task is one flow, with nearest relevant files and targeted validation.
- Do not expand mock UX or perform broad audits.
- Commit completed scopes separately; push/deploy only on explicit instruction.
- Update status docs only after implementation or Testnet evidence is verified.

## Phase 0 — Baseline and safety boundary

### Goal

Keep the current Arc/browser-wallet implementation safe while removing it as the product-default direction.

### Tasks

1. Record current Arc endpoints, release state machine, snapshot verification, and browser-wallet recovery boundary.
2. Preserve duplicate prevention, proof verification, workspace scope, approval sequence, and audit events.
3. Classify browser-wallet UI as technical fallback; do not add end-user recovery branches.
4. Add targeted regression coverage only for observed Testnet defects.

### Exit criteria

- Existing payment code is fail-closed and available only as fallback.
- No normal Web2 screen presents blockchain troubleshooting.

## Phase 1 — Unified Web2 workflow and roles

### Goal

Complete the everyday Owner/Contributor workflow without wallet terminology.

### Tasks

1. Verify Google invitation acceptance, selected workspace, navigation, and role-aware dashboard actions.
2. Verify Contributor: invitation → assigned payout → submit/resubmit → review result.
3. Verify Owner: contributor → payout → milestones → activate → review/approve.
4. Simplify normal copy/CTAs around work status and payment readiness; hide wallet/network terminology before payment setup.
5. Verify server authorization matches visible Owner/Contributor capabilities and workspace selection.

### Exit criteria

- Contributor completes assigned work without a wallet.
- Owner reaches an approved milestone with no blockchain setup.
- Invitation membership, role, and workspace isolation are server-verified.

## Phase 2 — Payment-account foundation

### Goal

Introduce a provider-backed payment account without turning normal workflow into Web3 UX.

### Tasks

1. Define the payment-account abstraction: provider wallet ID, owner user, Arc address, status, and immutable payment snapshots.
2. Add database/API authorization so only account owner and release service can use it; never expose provider credentials or keys in the browser.
3. Implement Google-driven provisioning/recovery for the selected user-controlled embedded-wallet provider.
4. Present only `Payment account ready` or `Finish payment account setup` in Settings; no provider/address jargon by default.
5. Keep Contributor destination separate: verified profile default, workspace override, no mutation of approved payout snapshots.

### External prerequisite

The workspace owner must approve provider choice and configure Testnet credentials, callback/origin settings, funding, recovery, and fee policy. Circle user-controlled wallets are recommended pending that approval.

### Exit criteria

- Google Owner has a secure, recoverable Testnet payment account.
- Normal UI uses payment-account language only.
- Provider keys/signing authority stay outside browser app state.

## Phase 3 — Background Testnet payment execution

### Goal

Send and reconcile a bounded real Arc Testnet payment without exposing blockchain operations to the Owner.

### Tasks

1. Replace normal `Pay` with one confirmation: milestone, contributor, recipient, amount, `Confirm payment`.
2. Create one idempotent release and request provider authorization through the embedded rail.
3. Persist provider request identity and immutable source/destination/amount snapshots.
4. Move payment to `Processing`; server-side provider/on-chain reconciliation runs in background.
5. On confirmation, persist proof, milestone, payout, activity, and notifications atomically as applicable.
6. On deterministic pre-submission failure, show `Payment needs support` or safe retry only when server knows no request reached network.

### Testnet prerequisites

- Dedicated funded payment account and contributor destination.
- Small approved Testnet USDC amount.
- Explicit approval to enable real execution and submit the bounded transaction.

### Exit criteria

- One real Arc Testnet payment is confirmed and remains `Paid` after reload.
- Owner never enters a hash, changes network, selects an account, or decides retry safety.
- Execution gate returns to disabled after test.

## Phase 4 — Background reconciliation and internal operations

### Goal

Make uncertain provider/on-chain outcomes safe without turning them into Owner troubleshooting.

### Tasks

1. Add bounded server reconciliation scheduling for `Processing` using provider status and exact on-chain verification.
2. Apply deterministic outcomes: confirmed → `Paid`; verified pre-broadcast cancellation → safely retryable; other uncertainty → `Payment needs support`, retry locked.
3. Create minimal Owner status and internal/admin diagnostics with request IDs, hashes, explorer links, and safe resolution controls.
4. Require internal resolutions to re-run server verification and write immutable audit events.
5. Add targeted tests for duplicate prevention, stale attempts, workspace scope, authorization, and observed Testnet defects.

### Exit criteria

- Normal users see simple payment status only.
- Technical intervention is internal-only.
- No uncertain payment can create a duplicate release.

## Phase 5 — Optional advanced integrations

### Goal

Decide if self-custodied browser-wallet payment is needed after the default rail has Testnet evidence.

### Tasks

1. Measure whether advanced self-custody is required by real users.
2. If retained, place it behind explicit `Advanced payment options`, outside normal onboarding/daily payment UI.
3. Reuse snapshot verification/reconciliation safeguards; never reintroduce manual hash/retry troubleshooting to normal screens.
4. If not required, deprecate only the exposed browser-wallet payment UI after embedded rail verification.

### Exit criteria

- Browser-wallet support is bounded advanced integration or safely removed from customer-facing product.

## Non-goals

- Mock/simulated payment as acceptance evidence.
- Custody of user private keys by SettleFlow.
- RPC, chain, hash, explorer, wallet-account switching, or reconciliation decisions in normal Owner/Contributor UX.
- Production rollout, escrow, multi-chain, multisig, or KYC/KYB work.
