# Testnet Web2/Web3 Execution Plan

Status: active

## Objective

Deliver a Web2-first SettleFlow experience, then verify the advanced browser-wallet payment rail on Arc Testnet. Payment acceptance uses real Arc Testnet transactions; simulated/mock payments are not acceptance evidence for this plan.

## Product decisions

- The default account experience is Google/Web2. A wallet is optional until an Owner chooses Wallet payment.
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

### Exit criteria

- The Owner can understand exactly what will be paid and how to resolve every supported preflight failure.
- No crypto terminology blocks earlier Web2 workflow steps.

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

