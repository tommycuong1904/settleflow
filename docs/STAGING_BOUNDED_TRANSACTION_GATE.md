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
| Source wallet | `<dedicated staging wallet>` |
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

Both are server-side environment variables. If either is absent or not equal to the required value, real execution MUST NOT proceed. No client-side value can satisfy these checks. The dual gate is enforced in `lib/arc/send.ts` and cannot be bypassed by any browser-controlled variable.

## Mandatory safety requirements

Every MUST-HAVE item below must be verified before any execution decision. Refer to `STAGING_ENVIRONMENT_SPEC.md` for target configuration, `STAGING_PROVISIONING_CHECKLIST.md` for provisioning evidence, and `ARC_STAGING_SAFETY_RUNBOOK.md` for execution and post-transaction procedure.

- [ ] Dedicated staging signing key (`ARC_SERVER_PRIVATE_KEY`) — generated for staging only, no real funds
- [ ] Production signing key MUST NOT be used in staging
- [ ] Isolated staging database — separate PostgreSQL instance, independent `DATABASE_URL`
- [ ] Staging-only authentication secret (`SETTLEFLOW_AUTH_SECRET`) — unique to staging
- [ ] Staging-only webhook destination — isolated from production destinations
- [ ] Migration verification — `prisma migrate deploy` against staging DB, all required migrations present (release/proof tables, `Release_one_active_per_milestone` partial unique index)
- [ ] Source wallet identity verification — derived address matches the expected staging wallet
- [ ] Recipient verification — recipient address matches the approved staging test recipient
- [ ] Amount verification — transaction amount matches the approved small test amount
- [ ] Network/token verification — chain ID, RPC, explorer, and USDC token contract match approved sources
- [ ] Funding/fee limit verification — staging wallet has sufficient gas funds and USDC balance for the approved amount, with fee limits recorded
- [ ] Release/proof record inspection — `GET /api/v1/releases/[id]` and direct DB reads confirm queued/pending state before execution
- [ ] Post-transaction explorer verification — read-only receipt check on approved explorer
- [ ] Database verification — release and proof rows preserved with correct final state

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

- [ ] 1. Dedicated staging signing key
- [ ] 2. Production key not used
- [ ] 3. Isolated staging database
- [ ] 4. Staging-only authentication secret
- [ ] 5. Staging-only webhook destination
- [ ] 6. Migration verification
- [ ] 7. Source wallet identity verification
- [ ] 8. Recipient verification
- [ ] 9. Amount verification
- [ ] 10. Network/token verification
- [ ] 11. Funding/fee limit verification
- [ ] 12. Release/proof record inspection
- [ ] 13. Post-transaction explorer verification
- [ ] 14. Database verification

## Authorization statement

This document does not authorize real execution. It only defines the conditions under which an authorized operator may later make that decision.

DO NOT ENABLE REAL EXECUTION UNLESS EVERY MUST-HAVE CHECK IS VERIFIED.