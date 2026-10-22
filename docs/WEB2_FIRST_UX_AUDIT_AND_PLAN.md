# Web2-first UX audit and implementation plan

Status: implementation in progress; Phases 1–3 and the scoped Phase 4 surfaces are delivered
Last audited: 2026-10-22
Scope: current application routes and workflow surfaces in the repository, with the active testnet implementation as the starting point.

## Decision record

SettleFlow will optimize the product experience for a Web2 user. Blockchain is a settlement rail, not the primary mental model.

For the immediate testing phase, the recommended default is a **simulated payment**:

- an Owner deliberately marks one approved milestone as paid for testing;
- the UI says **Simulated payment — no funds moved**;
- it creates no Arc transaction, transaction hash, explorer link, or `TransactionProof`;
- it remains distinct from a wallet/Arc payment in storage, activity, receipt, reporting, and notifications;
- a real wallet payment remains an explicit advanced method, never a silent fallback.

This decision is a product/workflow direction, not an authorization to weaken payment controls. No implementation should start until the updated Arc material has been reviewed and the payment-method data contract has been agreed.

## Arc documentation refresh — 2026-10-20

The official Arc documentation index at `https://docs.arc.io/llms.txt` was re-collected on 2026-10-20. It changes the technical review gate for every real Arc payment path:

| Official Arc guidance | Consequence for SettleFlow |
| --- | --- |
| USDC is Arc's gas token, rather than ETH. | Wallet setup, balance checks, fee copy, and testnet funding must account for available USDC for both the transfer and gas. |
| Native USDC uses **18 decimals**, not the familiar 6-decimal ERC-20 assumption. | Re-audit all amount parsing, display conversion, transfer construction, balance reads, verification, fixtures, and tests before changing payment execution. Do not infer units from existing `amountUsdc` names. |
| Arc has a two-state lifecycle: `pending` or final; deterministic finality is under one second. | The future adapter should not present generic Ethereum-style multi-confirmation progress. It needs a clear pending/final state and an explicit unknown-submission recovery path. |
| Arc's EVM behavior differs from Ethereum: a USDC system emitter records balance changes, a 20 Gwei `maxFeePerGas` floor applies, blocklist reverts can consume gas without a receipt, and `address(0)` transfers revert. | Current send, receipt verification, transaction-history/indexing, error classification, and recipient validation require a dedicated Arc compatibility audit before testnet execution is treated as verified. |
| Arc publishes dedicated references for RPC/network config, contract addresses, gas/fees, transaction lifecycle, wallet integration, relayers/paymasters, and App Kit Send. | Do not hard-code chain or token facts from memory. Select the final payment adapter only after these references and the incoming Arc material are reconciled. |

The re-collected index also identifies relevant optional paths for later evaluation: Circle Wallets (developer- and user-controlled), App Kit Send, EIP-3009 relayers, ERC-4337 paymasters, and Arc transaction memo/batching. These are **research inputs**, not chosen implementation dependencies.

### Arc-specific pre-implementation checklist

Before Phase 5 (or any modification to `lib/arc/**`), review the live official pages for:

1. Connect to Arc / RPC endpoints and contract addresses — source of truth for testnet network and USDC configuration.
2. EVM differences and USDC system events — source of truth for units, transfer detection, recipient constraints, and indexing.
3. Gas and fees plus transaction lifecycle — source of truth for estimation, status UI, retry and finality semantics.
4. The selected integration path: browser wallet, Circle user-controlled wallet, App Kit Send, relayer, or paymaster.
5. The product owner's incoming Arc material — it takes precedence for the intended provider/account model when it is more specific and current.

### Compatibility corrections applied from the official references

- Arc Testnet defaults now use the official Circle RPC and explorer hostnames.
- Server-side ERC-20 transfers retain six-decimal application amounts, which matches Arc's recommended ERC-20 interface for application transfers. Native gas remains independently represented in 18-decimal units.
- The server executor now applies Arc's 20 Gwei `maxFeePerGas` floor, preserving a higher RPC quote when available. This does not authorize real execution; the existing server authorization gate remains in effect.

## Executive finding

The current app has a solid milestone-workflow backbone, but the public product language and information architecture are Web3-first. A normal business user is asked to understand wallets, Arc Testnet, USDC, releases, proofs, hashes, and network recovery before they can understand the simple business task: **agree work, approve it, pay it, and keep a record**.

The highest-impact correction is not cosmetic. The payment domain currently equates a completed payment with a confirmed blockchain proof. That blocks a safe simulated workflow and would also block future bank/card/invoice methods. The new design must introduce a payment-method abstraction before the UI is simplified around it.

## Audit findings

### P0 — structural blockers

| Surface | Current behavior | Why it is difficult for a Web2 user | Required direction |
| --- | --- | --- | --- |
| Payment domain | `Release` requires a destination EVM wallet and creates a `TransactionProof`; milestone completion is driven through proof confirmation. | A payment cannot exist without blockchain evidence, so “demo” would either be misleading or incorrectly reuse an Arc proof. | Introduce a payment-attempt/settlement record with an explicit method and evidence type. A simulated payment must have `evidence = none` and no transaction proof. |
| Release API | `POST /api/v1/milestones/[id]/release` is owner-only and currently only enables `browser_wallet`. | The business verb is hidden behind a chain-specific technical action. | Keep the route as a rail-specific execution route. Add a separate, explicit owner-authorized simulated-payment action after data design approval. |
| Contributor and payout creation | Contributor wallet and payout `targetWalletAddress` are required and EVM-validated in UI, API, repository, and activation checks. | A user cannot add a contractor or create a payout without knowing an address. | Make payment destination optional at creation. Collect email/name first; request method-specific details only when payment is being prepared. |
| Authentication gate | Main app UX and wallet gate present wallet connection as the prerequisite for working. | It makes a browser wallet look like the product account. | Google/email product sign-in must be primary. Wallet linking should be an optional payment-method setup step. Preserve the protected GIS flow exactly as documented. |

### P1 — high-impact UX and language issues

| Surface | Observed issue | Change |
| --- | --- | --- |
| Landing page | Arc, USDC, release, and proof framing is prominent. | Lead with controlled milestone payments, approvals, collaborators, and payment records. Place “Powered by blockchain settlement” in an optional trust/technical section. |
| Dashboard | Wallet gate and proof-centric labels dominate; metrics include settlement exposure and proof queues. | Replace with business queues: Needs your review, Ready to pay, Payment in progress, Recently paid. Technical payment state appears only after opening a payment. |
| Payout list/detail | Wallet address is shown as a primary payout attribute; descriptions mention Arc settlement proof. | Show contributor, total, progress, due date, and payment state first. Hide wallet address in **Payment method** only when a crypto rail is selected. |
| Payment CTA/modal | Current flow asks users to verify wallet/sign and exposes low-level failure/reconciliation states. | Start with **Pay milestone** → select method → review amount/recipient → confirm. Wallet-specific confirmation and recovery live only inside the crypto method path. |
| Payment record | Transaction proof card exposes hash/network/block/failure reason as a major surface. | Rename to **Payment details**. Business status and receipt are default; a “Technical details” disclosure is shown only for crypto settlements. No payment record is shown merely because an attempt has failed before a transaction exists. |
| Activity | Entries use release/proof vocabulary and formerly exposed wallet provider identity. | Use human actions: “Milestone approved”, “Payment marked complete”, “Payment sent”, “Payment confirmed”. Omit provider/wallet names by default. |
| Contributors | Add/edit forms require an EVM address; list has Arcscan address affordances. | Fields: name, email, role, notes. Payment method setup becomes optional and contextual. |
| Create payout | The required wallet field blocks creation. | Create agreement with person, scope, milestones, amount, due date. Choose payment method at payment time or optionally configure it in advance. |
| Settings/navigation | Arc Testnet, faucet, network switches, connected wallet, and export terminology are always visible. | Move crypto/testnet controls behind an **Advanced / Developer** area. Show test-mode badge only in non-production. |
| Receipts/exports | “Settlement receipt”, Arc network, wallet and transaction details are central. | Default to a **Payment summary**: recipient, milestone, amount, status, date, method. Include proof/transaction section only when it exists. |

### P2 — clarity, visual hierarchy, and resilience

- Replace crypto terms in primary copy: `release` → `payment`, `proof` → `payment confirmation` or `transaction details`, `wallet` → `payment method` unless the crypto rail is selected.
- Keep a single primary action per payout state. Approval should lead immediately to payment selection, not duplicate “Payment action” panels elsewhere on the page.
- Keep raw provider errors, RPC failures, hashes, and block numbers in a disclosure that includes a plain-language explanation and a next action.
- Use one terminology set across dashboard, payout detail, activity, notifications, receipts, and email/push messages.
- Preserve auditability: friendly labels are presentation changes; durable activity and method-specific evidence must remain queryable.

## Recommended target experience

```text
Create payout
  → choose contributor (name/email first)
  → define milestones
  → activate
  → contributor submits work
  → owner approves
  → Pay milestone
       ├─ Simulated payment (test mode; no funds move)
       └─ Wallet payment (advanced; Arc Testnet details and signature)
  → payment summary / activity record
```

The simulated method is intentionally useful only in development/test mode. It must not be callable in a live environment unless a separate explicit policy is approved.

## Data and API design required before UI implementation

Do not overload `TransactionProof` for non-chain payments. Its name and existing invariants mean “evidence of an Arc transaction.”

The recommended design is a method-neutral persisted payment record, conceptually:

| Field / relationship | Purpose |
| --- | --- |
| `PaymentAttempt` (or approved equivalent) | One durable payment workflow record for a milestone; supports idempotency and audit. |
| `method` | Initially `simulated` and `crypto_wallet`; future methods may include bank, card, or invoice. |
| `status` | A method-neutral lifecycle such as `pending`, `completed`, `failed`, `cancelled`. Do not make “confirmed onchain” the only completed state. |
| `evidenceType` | `none`, `transaction`, or future provider receipt. `simulated` always uses `none`. |
| recipient snapshot | Capture the recipient identity/details applicable to the selected method at confirmation time. |
| amount/currency + actor/time | Immutable business audit data. |
| rail-specific relation | Crypto uses a related release/proof record; other methods use their own evidence, if any. |

Required invariants:

1. An approved milestone may have only one active/completed payment attempt unless an explicitly designed recovery policy permits replacement.
2. A simulated payment changes milestone/payout progression atomically but cannot create a transaction proof, hash, explorer URL, or “onchain confirmed” notification.
3. Only the authorized Owner may initiate/complete a simulated payment in test mode.
4. Idempotent duplicate requests return the existing payment result; they do not create duplicate activity, notification, or payment records.
5. The current browser-wallet source-binding and transaction-verification invariants remain unchanged for crypto attempts.
6. API authorization derives the Owner from the signed session; no client-provided actor identity becomes authoritative.

## Phased implementation plan

### Phase 0 — provider and product contract gate (no code)

1. Review the new Arc documentation supplied by the product owner.
2. Compare its account model, network/RPC requirements, token/USDC assumptions, transaction lifecycle, retries, and evidence APIs against `lib/arc/**` and the current release/proof model.
3. Write a short decision record for the first real crypto payment method: browser wallet, Circle user-controlled wallet, or another approved rail.
4. Approve exact terminology: `Payment`, `Payment method`, `Simulated payment`, `Payment summary`, and `Technical details`.
5. Decide whether simulated payments are dev-only through environment policy, workspace setting, or both.

Exit criteria: approved method-neutral lifecycle and no conflict with the incoming Arc provider model.

### Phase 1 — domain foundation and safe simulation — Implemented 2026-10-20

1. Add a dedicated method-neutral payment persistence model and migration; do not mutate old proof history.
2. Implement owner-authorized, workspace-scoped `POST` action for a simulated payment.
3. Atomically lock milestone/payout, validate approved state and exact amount, persist completed simulated payment, mark the milestone paid/released according to the approved domain naming, recalculate payout status, and write one activity event.
4. Do not call Arc RPC, wallet adapter, release executor, transaction verifier, or proof-refresh code from this action.
5. Add notification copy: “Payment marked complete (simulated). No funds moved.”
6. Add unit and DB integration tests for authorization, workspace isolation, idempotency, duplicate prevention, no-proof guarantee, and status recalculation.

Delivered: `PaymentAttempt` is persisted with method/status/evidence/recipient/actor data; the Owner-only simulated-payment route is available only in mock/demo mode; its DB transaction is idempotent, writes activity/notifications, atomically releases the milestone/recalculates the payout, and creates no `Release` or `TransactionProof`. Unit/type and DB integration validation passed. The payment-method selection UI is intentionally deferred to Phase 2.

### Phase 2 — payment-method UX vertical slice — Implemented 2026-10-22

1. Replace the default approved-milestone CTA with **Pay milestone**.
2. Build one modal with method selection: **Simulated payment (test mode)** first and **Wallet payment (Arc Testnet)** as Advanced.
3. Simulated review copy states amount, contributor, milestone, and the irreversible test effect; confirmation uses “Mark as paid (demo)”.
4. Success state says “Payment recorded for testing” and “No funds moved.”
5. Wallet selection reuses the existing release/sign flow but only after the method selection screen.
6. Update payout detail, activity, toast, notification, and export state to distinguish the two methods consistently.

Exit criteria: a new user can complete the test workflow without encountering a wallet, network, hash, or Arc-specific term.

Delivered so far: the approved-milestone action now starts with **Pay** and opens a method-selection modal. In mock/demo mode, **Simulated payment** is the first option and its confirmation clearly states that no funds, wallet request, Arc transaction, hash, or settlement proof will be created. **Wallet payment** remains an explicitly labelled Advanced option and retains the existing signed Arc Testnet flow. Successful simulated payments update the milestone/payout state, activity, and toast without displaying crypto-only completion language.

Payment summaries and JSON exports now include the persisted payment method/evidence and omit Arc/wallet transaction language for a simulated payment. The simulated-payment confirmation names the milestone, contributor, amount, and irreversible test effect. The authenticated browser E2E covers approve → **Pay** → simulated-payment confirmation → method-aware payment summary, including the absence of Arc settlement copy. Wallet/network/hash language is confined to the explicitly selected Advanced wallet path.

### Phase 3 — remove crypto as a creation-time requirement — Implemented 2026-10-22

1. Make contributor wallet address optional in schema, repositories, API validation, and forms; preserve duplicate validation when an address is provided.
2. Make payout target wallet optional; remove it from payout activation invariants for non-crypto workflows.
3. Add recipient contact/payment-preference fields only after the selected future payment rails are designed.
4. Make method-specific recipient validation happen when that method is selected, not when a contributor is created.
5. Migrate existing EVM addresses intact and test null-address list/search/edit behavior.

Exit criteria: a payout can be created, activated, submitted, reviewed, and completed as simulated without a wallet address.

Delivered: contributor wallet addresses and payout target wallets are nullable; creation, activation, list/search, and edit paths accept an absent wallet; the creator and contributor forms explain that a wallet is only needed for Wallet payment; and the payout-creation wallet gate is removed. The Advanced Wallet payment method blocks before review when the contributor has no wallet, while the wallet-release repository remains fail-closed if a destination is absent. DB integration proves simulated payment with no contributor or payout wallet, and browser E2E proves create → activate with a null target wallet. Future payment-contact fields and broader Web2-first copy remain Phase 4 work.

### Phase 4 — Web2-first information architecture and copy — In progress 2026-10-22

1. Refactor landing, dashboard, sidebar, headers, empty states, and onboarding around business outcomes.
2. Replace wallet gate with account/workspace onboarding; retain wallet connect only inside advanced payment setup.
3. Rework payment record to a compact payment summary with technical crypto details in disclosure.
4. Refactor receipt/export to be method-aware.
5. Move faucet, network, RPC health, explorer links, and connected-wallet management into advanced/developer surfaces.
6. Audit all role-specific copy, activity, emails/webhooks, push notifications, and errors for terminology consistency.

Exit criteria: a moderated usability pass can complete create → submit → approve → simulated pay without Web3 assistance.

Delivered so far: the landing page now leads with work, approval, payment, payment records, and safe simulation, while Arc/USDC sit in a later infrastructure section; the dashboard includes simulated payments in recent payment history and uses payment-oriented action labels; its empty state now guides Owners through adding a contributor then creating a payout, while other roles receive an accurate waiting state; Dashboard and Contributors no longer show a client-side wallet gate after the server has already verified Google/session workspace access; contributor cards lead with identity, contact, role, payout progress, and invite actions rather than wallet/Arcscan controls; contributor forms lead with name/email and defer the optional wallet to an Advanced payment setup disclosure; Create payout now frames the workflow as contributor → work/milestones → review/create, hides wallet configuration in an advanced disclosure, and removes Arc/release/proof language from the default review; the payout overview now presents Payment setup rather than a wallet address, uses paid/payment terminology, and exports one method-aware Payment summary; in-app and webhook notifications now use work/approval/payment wording and do not expose wallet, raw transaction hash, Arc, or raw failure detail by default; Activity derives payment-oriented titles even when reading historic release/proof records and keeps transaction/explorer data out of the default ledger while preserving it in payment details and CSV export; payout lists use payment-oriented status labels and no longer foreground recipient wallets; milestone UI presents approved work as ready to pay and completed work as paid, with transaction details deferred to the relevant record; wallet-payment details now lead with payment status, milestone, and time, while network, block, transaction hash, and explorer access are contained in a Technical details disclosure; failed wallet payments now state whether no payment was sent or a prior attempt needs review, present a safe next-step decision before retry, and defer raw errors to Technical details; activity uses payment language and includes simulated payments in its payment filter; Settings now frames account/workspace/notifications as the normal configuration, labels Wallet payment as optional, and confines Arc/RPC actions to Developer tools for testnet troubleshooting; wallet/network/faucet controls moved from persistent navigation into Settings → Advanced; the account menu uses signed-in-account/sign-out language for Web2 users; and the protected GIS button is the first sign-in choice, with browser-wallet sign-in behind an explicit advanced disclosure. Broader onboarding and terminology consistency work remain open.

### Phase 5 — real method integration and operational verification

1. Implement the chosen Arc method as a payment-method adapter behind the new model.
2. Map provider-specific pending/failed/reconciliation states to method-neutral user states.
3. Preserve Arc transaction verification, source binding, and failure safety boundaries.
4. Complete testnet verification using controlled wallets and documented recovery scenarios.
5. Update runbooks, security invariants, workflow docs, feature matrix, and `CURRENT_STATE.md` only after evidence exists.

Exit criteria: testnet behavior is verified end-to-end; a production decision remains separately gated.

## Route-by-route implementation backlog

| Route/surface | Priority | Planned change |
| --- | --- | --- |
| `/` | P1 | Reframe value proposition and feature language; crypto becomes optional trust detail. |
| `/dashboard` | P1 | Business queues and payment states; remove wallet prerequisite from primary UX. |
| `/payouts` | P1 | Use payment-oriented status and remove wallet-centric list emphasis. |
| `/payouts/new` | P0/P1 | Stop requiring EVM address; collect only agreement data initially. |
| `/payouts/[id]` | P0 | Method selector, simulated-pay modal, method-aware receipt/payment summary, technical disclosure. |
| `/contributors` | P1 | Name/email-first contributor management; optional advanced crypto destination. |
| `/activity` | P1 | Human payment events; filter/label technical chain events separately. |
| `/settings` | P2 | Advanced section for wallet/network/faucet/RPC configuration. |
| Auth modal / onboarding | P0 | Make verified Google/email product account primary while preserving protected GIS and optional wallet linking. |
| Notifications/webhooks/export | P1 | Method-neutral events; no false “USDC confirmed” for simulation. |

## Verification plan

### Automated

- Prisma migration deploy and generation against an isolated test database.
- Repository tests: state transitions, amounts, idempotency, method/evidence invariants.
- DB integration: owner authorization, cross-workspace denial, contributor denial, double-submit race, no `TransactionProof` on simulated payment, and payout rollup.
- Route tests: validation/error contract and session-derived owner context.
- E2E: Google/email account path (when safely configured), contributor without wallet, payout creation without wallet, simulated payment, advanced wallet path visibility, and responsive/mobile confirmation.

### Manual testnet

- Simulated payment: confirm activity, receipt, dashboard, payout status, reload persistence, and absence of Arc explorer/hash/proof.
- Wallet payment: successful transfer, rejected signature, wrong account, wrong network, RPC unavailable, timeout/unknown submission, retry safety, and reconciliation.
- Accessibility: keyboard modal flow, focus restoration, screen-reader labels, contrast, and plain-language error recovery.

## Risks and explicit non-goals

- Do not label a simulated payment as paid onchain, USDC settled, or confirmed by Arc.
- Do not add real bank/card rails, store bank details, or alter Google OAuth configuration in this programme without separate product, security, compliance, and provider decisions.
- Do not weaken existing release source binding, confirmation verification, or session/workspace authorization to simplify UX.
- Do not deploy a data migration until a migration review confirms all existing release/proof history continues to render accurately.
- The current Arc testnet integration remains operationally unverified; incoming Arc documentation may change the Phase 5 adapter decision.

## Documentation updates required at each phase

| When | Update |
| --- | --- |
| Before Phase 1 | `DOMAIN_MODEL.md`, `WORKFLOW_STATE_MACHINE.md`, `AUTHORIZATION.md`, `SECURITY_INVARIANTS.md` design changes, then this plan decision log. |
| After Phase 1 verification | `CURRENT_STATE.md`, `FEATURE_MATRIX.md`, domain/workflow/security docs, and test count/status evidence. |
| Before/after real Arc method work | `ARCHITECTURE.md`, `OPERATIONS_RUNBOOK.md`, Arc-specific runbooks, security invariants, and this plan. |
