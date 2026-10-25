# Testnet Web2/Web3 Execution Plan

Status: active

## Objective

Deliver a Web2-first SettleFlow experience, then verify the advanced browser-wallet payment rail on Arc Testnet. Payment acceptance uses real Arc Testnet transactions; simulated/mock payments are not acceptance evidence for this plan.

## Product decisions

- The default account experience is Google/Web2. A wallet is optional until an Owner chooses Wallet payment.
- A user may link one or more verified browser-wallet addresses to their profile. The profile's verified payout address is the default recipient across workspaces; a Contributor may override it for one workspace when needed. An override never changes existing or already-approved payouts.
- An Owner's linked wallet is a signing source, while a Contributor's profile/workspace wallet is a payment destination. SettleFlow must not treat a typed address as verified ownership.
- The active MVP roles are **Owner** and **Contributor**. `ops` and `reviewer` are legacy-compatible roles, not new product roles in this plan.
- Web3 details are progressively disclosed at the payment boundary only.
- Testnet uses isolated wallets, database, and configuration. Production remains out of scope.

## Autonomous execution rule

The agent completes all bounded engineering tasks in the current phase without waiting for another user message. It reports only when the phase is complete or when an external/operator action is required.

The agent must stop for user action only when one of these is required:

1. Editing Vercel/Neon/Google/OAuth/wallet-provider configuration.
2. Supplying, funding, switching, or signing with a browser wallet.
3. Explicit approval to enable `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION` and broadcast a real Arc Testnet transaction.
4. A product decision that materially changes roles, payment method, or user-facing scope.

Efficiency rules:

- One task is one flow, nearest relevant files only, and one targeted validation.
- No broad repository audit, mock UX expansion, or full suite unless release risk requires it.
- Commit each finished scope separately; push/deploy only on explicit user instruction.
- Update canonical status documentation only after verified implementation or Testnet evidence.

## Phase 0 — Testnet payment readiness audit

### Goal

Verify the existing browser-wallet path is safe to exercise on Arc Testnet without changing payment behavior.

### Tasks

1. Inspect Arc config, browser-wallet adapter, release readiness/creation route, proof refresh, and reconciliation path.
2. Reconcile code assumptions with current official Arc Testnet network, USDC, gas, and transaction-lifecycle references.
3. Confirm Owner/Contributor authorization, workspace scope, sequential milestone protection, duplicate prevention, and fail-closed behavior.
4. Add only missing targeted regression coverage discovered by the audit.

### Exit criteria

- A concise list of verified invariants and blockers exists.
- No unresolved code blocker remains for a small browser-wallet Testnet payment.
- Vercel action list is limited to changing the deployment to `real` while the execution gate remains `disabled`.

### Audit record — 2026-10-25

- Verified: `real` mode is server-gated for both readiness and release creation; a public execution-mode value alone cannot create a release or proof.
- Verified: browser-wallet releases require an Owner Web3 session with an enabled, transaction-capable linked EOA; session, workspace, milestone approval, sequence, amount, destination, and source-wallet checks are server-side.
- Verified: confirmation checks chain, configured USDC contract, sender, recipient, exact six-decimal transfer amount, successful receipt, and reconciles only unambiguous post-request transfers.
- Verified: Arc transaction/reconciliation unit coverage passed (24 tests). The default fallback RPC now matches Arc's documented `https://rpc.testnet.arc.network` endpoint.
- Open Testnet evidence: browser-wallet App Kit signing, wallet account/network handling, and proof persistence still require a real Arc Testnet transaction.
- Web2 boundary: a Google session may complete workspace workflow, but the current browser-wallet payment route requires a Web3 Owner session. Improving that handoff belongs to Phase 2; it is not required for the first Testnet transaction.

## Phase 1 — Web2 workflow completion

### Goal

Contributor and Owner complete their work workflow without wallet vocabulary or wallet setup.

### Tasks

1. Verify and correct Google-first sign-in, invitation handoff, selected-workspace navigation, and role-aware dashboard actions.
2. Verify Contributor flow: assigned payout → submit/resubmit → review status.
3. Verify Owner flow: contributor → payout → milestones → activate → review/approve.
4. Keep one primary CTA for each workflow state; use business language in normal views.

### Exit criteria

- A Contributor can complete work submission without a wallet.
- An Owner can reach an approved milestone without a wallet.
- Server authorization enforces the same boundaries shown by the UI.

## Phase 2 — Web3 payment UX completion

### Goal

Make the advanced Arc Testnet wallet flow clear and recoverable for an Owner.

### Tasks

1. Validate payment preflight: role, workspace, approval state, milestone order, recipient, account, network, and RPC.
2. Validate review/sign modal copy and focused account/network correction actions.
3. Present payment status as submitted, pending, confirmed, or needs review; put hash/network details behind a technical disclosure.
4. Validate no duplicate payment is offered after pending or unknown submission.
5. Add the Web2-to-Web3 wallet setup flow: allow a signed-in Google user to link and verify a browser wallet from Settings; use their verified profile payout address by default when they join a workspace, with an explicit workspace-level recipient override.
6. Show the recipient-wallet state in plain language: verified profile address, workspace override, or action needed. Keep manual Owner entry as a recovery path and label it as unverified until the Contributor verifies it.

### Exit criteria

- The Owner can understand exactly what will be paid and how to resolve every supported preflight failure.
- No crypto terminology blocks earlier Web2 workflow steps.
- A Contributor can set a verified default payout address once and safely use or override it per workspace.

## Phase 3 — Real Arc Testnet execution and reconciliation

### Goal

Complete and reconcile one bounded real Arc Testnet wallet payment.

### User/operator prerequisites

- Dedicated Owner and Contributor Testnet wallets.
- A small approved Testnet USDC amount.
- Explicit approval to temporarily enable the execution gate and sign the transaction.

### Tasks

1. Set `NEXT_PUBLIC_ARC_EXECUTION_MODE=real`; keep `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION=disabled` for read-only checks.
2. Verify the approved payout reaches the review/sign step.
3. After explicit approval, enable the gate, deploy, sign one payment, then disable the gate again.
4. Reconcile sender, recipient, amount, transaction hash, proof, milestone, payout, activity, and reload persistence.
5. Exercise wrong network/account and pending/failed recovery without broadcasting duplicate payments.

### Exit criteria

- One Arc Testnet transaction is confirmed and reconciled.
- Payment state and explorer evidence agree.
- The gate returns to `disabled`.

## Phase 4 — Testnet hardening

### Goal

Fix only evidence-backed failures and leave a repeatable Testnet release process.

### Tasks

1. Turn each real Testnet defect into a narrow regression test.
2. Fix payment/reconciliation/authorization defects in isolated commits.
3. Update `CURRENT_STATE.md`, `FEATURE_MATRIX.md`, workflow, authorization, and operations docs with verified evidence.

### Exit criteria

- Repeated Testnet payments do not create duplicate releases/proofs.
- Recovery behavior is documented and verified.
- Production planning can begin separately.

## Next planned capability — Embedded-wallet hybrid

This work begins only after Phase 3 has one reconciled Arc Testnet payment. It is deliberately sequenced after the first transaction so a wallet-provider integration cannot delay validation of the existing non-custodial browser-wallet rail.

### Goal

Give a Google-first user an optional embedded, non-custodial wallet while retaining support for self-custodied browser wallets.

### Product model

1. A selected embedded-wallet provider creates and recovers the default wallet through the user's Google/passkey identity; SettleFlow must not generate or retain private keys itself.
2. The user may connect additional self-custodied wallets and select a default source or payout address.
3. The profile's verified payout address remains the default across workspaces; an explicit workspace override remains available without changing existing or approved payouts.
4. The current Owner-entered Contributor address remains the Testnet fallback until the Contributor has verified a profile or workspace destination.

### Required design gate

Select the provider and approve recovery, custody, export, transaction-authorization, fee, privacy, and support responsibilities before implementation. Circle Smart Wallet is not assumed to be the selected provider.
