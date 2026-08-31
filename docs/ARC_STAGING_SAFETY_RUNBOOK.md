# Arc Staging Safety Runbook

This is a safety document, NOT AUTHORIZATION TO EXECUTE.

## Hard stop

NO REAL ARC TRANSACTION MAY BE EXECUTED UNLESS A SEPARATE WRITTEN SAFETY GATE AUTHORIZES PHASE 4E.

## Required verification

Before any approval, verify the isolated staging environment, Arc network, chain ID, RPC, explorer, and USDC token against approved sources. Use a dedicated staging wallet and signing key, with funding and fee limits recorded as **NOT YET APPROVED** until explicitly set. Verify recipient and transaction amount against an approved test plan.

## Execution controls

Use only the approved execution mode and one bounded release. Confirm release preconditions and persisted queued state before submission. Do not automatically retry an ambiguous transaction. Record transaction hash immediately when known, then verify receipt, proof, release state, and activity state.

## Post-transaction

Perform independent read-only verification of transaction, recipient, amount, token, and persisted proof. Escalate any uncertainty through `RELEASE_RECONCILIATION_RUNBOOK.md`; never send another transaction while outcome is ambiguous.
