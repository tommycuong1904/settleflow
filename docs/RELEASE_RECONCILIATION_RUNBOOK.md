# Release Reconciliation Runbook

## Core rule

When transaction outcome is ambiguous, DO NOT SEND ANOTHER TRANSACTION.

## Procedures

1. Submitted but response lost: freeze retry, preserve queued/pending state, collect release and wallet evidence, and escalate.
2. Hash known but confirmation unknown: perform read-only receipt checks; keep pending until independently resolved.
3. Confirmed but proof refresh failed: preserve hash, run authorized proof refresh, and verify activity/proof consistency.
4. Marked failed but chain may have succeeded: treat as ambiguous; reconcile hash, receipt, recipient, and wallet before any state change.
5. Duplicate retry: reject the retry, inspect latest release/proof, and record the incident.
6. RPC unavailable: preserve state and wait for an approved read-only verification path; do not infer failure.
7. Insufficient funds: freeze execution, verify wallet/environment, and obtain explicit funding approval.
8. Webhook failure: settlement state remains authoritative; record and replay only through an approved notification procedure.

There is no automated reconciliation worker currently. Release Operator owns first response; Incident Owner owns escalation; Application Owner owns state corrections.
