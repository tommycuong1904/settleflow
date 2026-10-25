# Staging Bounded Transaction Safety Gate

This is a SAFETY GATE DOCUMENT. It **does not authorize real execution**. It defines the conditions under which an authorized operator may later decide whether to execute exactly one bounded Arc staging transaction.

## Hard stop

DO NOT ENABLE REAL EXECUTION UNLESS EVERY MUST-HAVE CHECK IS VERIFIED.

NO REAL ARC TRANSACTION MAY BE EXECUTED UNLESS THIS GATE IS FULLY SATISFIED AND A SEPARATE EXPLICIT APPROVAL IS GIVEN BY AN AUTHORIZED OPERATOR.

## Scope

Exactly ONE bounded staging transaction. Nothing in this document authorizes additional, repeated, or production transactions.

## Transaction parameters (placeholders)

All values below are placeholders. They MUST be filled in and verified by an authorized operator before any execution decision. Do not substitute production values.

| Parameter | Value |
|---|---|
| Environment | STAGING |
| Network | `<approved Arc testnet>` |
| Execution path | `browser_wallet` (the only enabled new-release path) |
| Source wallet | `<dedicated staging Web3 owner EOA>` |
| Recipient | `<approved staging recipient>` |
| Token | `<approved USDC token>` |
| Amount | `<approved small test amount>` |
| Release | `<single approved milestone release>` |
| RPC | `<approved staging RPC>` |
| Explorer | `<approved staging explorer>` |
| Database | `<isolated staging PostgreSQL>` |

## Authorization conditions

Real execution requires BOTH conditions, verified immediately before execution:

1. `execution mode = real`
2. `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION = enabled`

`NEXT_PUBLIC_ARC_EXECUTION_MODE` is browser-visible and selects the intended Arc mode; it is **not** an authorization control. The server independently reads that mode and requires the server-only authorization variable before it creates a browser-wallet release. If the authorization variable is absent or not equal to the required value, real execution MUST NOT proceed and no release/proof record is created. This gate is enforced in `app/api/v1/milestones/[id]/release/route.ts`; the equivalent server-executor guard remains in `lib/arc/send.ts`.

## Mandatory safety requirements

Every MUST-HAVE item below must be verified before any execution decision. Refer to `STAGING_ENVIRONMENT_SPEC.md` for target configuration, `STAGING_PROVISIONING_CHECKLIST.md` for provisioning evidence, and `ARC_STAGING_SAFETY_RUNBOOK.md` for execution and post-transaction procedure.

- [ ] Dedicated staging Web3 Owner EOA — used only for this browser-wallet test, with no real funds
- [ ] Source EOA is linked to the Owner's verified Web3 session and marked transaction-enabled
- [ ] Browser wallet's active account matches the linked Owner EOA immediately before signing
- [ ] No production EOA or signing key is used in staging
- [ ] Isolated staging database — separate PostgreSQL instance, independent `DATABASE_URL`
- [ ] Staging-only authentication secret (`SETTLEFLOW_AUTH_SECRET`) — unique to staging
- [ ] Staging-only webhook destination — isolated from production destinations
- [ ] Migration verification — `prisma migrate deploy` against staging DB, all required migrations present (release/proof tables, `Release_one_active_per_milestone` partial unique index)
- [ ] Source wallet identity verification — verified Owner EOA matches the expected staging wallet
- [ ] Recipient verification — recipient address matches the approved staging test recipient
- [ ] Amount verification — transaction amount matches the approved small test amount
- [ ] Network/token verification — chain ID, RPC, explorer, and USDC token contract match approved sources
- [ ] Funding/fee limit verification — staging wallet has sufficient gas funds and USDC balance for the approved amount, with fee limits recorded
- [ ] Release/proof record inspection — `GET /api/v1/releases/[id]` and direct DB reads confirm queued/pending state before execution
- [ ] Post-transaction explorer verification — read-only receipt check on approved explorer
- [ ] Database verification — release and proof rows preserved with correct final state
- [ ] Named operator, approver, and incident owner are available for the entire test window
- [ ] Execution window and one-transaction limit are recorded before the gate is enabled

## Failure handling

The operator MUST respond according to the outcome:

| Outcome | Release state | Proof state | Operator action |
|---|---|---|---|
| confirmed | confirmed | confirmed | Verify receipt + DB state; confirm explorer, proof, and activity rows |
| reverted | failed | failed | Inspect revert reason; do NOT retry unless failed-proof retry eligibility is confirmed |
| send error | pending | pending | Treat as ambiguous; freeze retry, perform reconciliation |
| receipt timeout (tx hash known) | pending | pending | Perform read-only receipt check; keep pending until independently resolved |
| RPC unavailable | pending | pending | Preserve state; never infer failure; wait for approved read-only verification path |
| unknown outcome | pending | pending | Never retry; reconcile read-only via `RELEASE_RECONCILIATION_RUNBOOK.md` |

## Ambiguity invariant

- ambiguous ≠ failed
- ambiguous ≠ retryable

When outcome is ambiguous, the reconciliation runbook (`RELEASE_RECONCILIATION_RUNBOOK.md`) governs. Do not send another transaction.

## GO / NO-GO checklist

Every MUST-HAVE item from the mandatory safety requirements above must pass before authorization.

- [ ] 1. Dedicated staging Web3 Owner EOA
- [ ] 2. Session-linked, transaction-enabled source EOA
- [ ] 3. Active browser-wallet account matches source EOA
- [ ] 4. Production key/EOA not used
- [ ] 5. Isolated staging database
- [ ] 6. Staging-only authentication secret
- [ ] 7. Staging-only webhook destination
- [ ] 8. Migration verification
- [ ] 9. Recipient verification
- [ ] 10. Amount verification
- [ ] 11. Network/token verification
- [ ] 12. Funding/fee limit verification
- [ ] 13. Release/proof record inspection
- [ ] 14. Post-transaction explorer verification
- [ ] 15. Database verification
- [ ] 16. Operator, approver, and incident owner available
- [ ] 17. Bounded time window and one-transaction limit recorded

## Execution record (complete before enabling the server gate)

Do not put private keys, session tokens, or secrets in this document. Record only identifiers and evidence references.

| Field | Required value |
|---|---|
| Date/time window (UTC) | `<start – end>` |
| Authorized operator | `<name or role>` |
| Approver | `<name or role>` |
| Incident owner | `<name or role>` |
| Payout / milestone ID | `<UUID>` |
| Source EOA | `<checksum address>` |
| Recipient EOA | `<checksum address>` |
| USDC amount and maximum | `<amount>` |
| Approved RPC / explorer | `<URLs>` |
| Approval evidence | `<ticket, signed note, or change record>` |

After the single signature attempt, immediately return `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION` to its disabled state. If a transaction hash is absent or its outcome is unknown, keep the gate disabled and follow `RELEASE_RECONCILIATION_RUNBOOK.md`; do not attempt another payment.

## Authorization statement

This document does not authorize real execution. It only defines the conditions under which an authorized operator may later make that decision.

DO NOT ENABLE REAL EXECUTION UNLESS EVERY MUST-HAVE CHECK IS VERIFIED.
