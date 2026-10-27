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

## Automated testnet reconciliation

Vercel invokes `GET /api/v1/cron/reconcile-releases` once daily. It requires
the `CRON_SECRET` environment variable; Vercel supplies it as a Bearer token.
The job considers at most 20 browser-wallet releases that are older than the
60-second callback grace window and still have a pending proof.

- Exactly one independently verified Arc USDC transfer: claim the queued
  release if necessary and record the normal confirmed proof.
- No verified transfer: preserve the pending release.
- More than one candidate or any verification error: preserve the pending
  release and expose the count in the cron response/logs.

The job never sends funds, retries a release, or marks a release failed. Owner
reconciliation remains required for any closure without a verified transfer.

Release Operator owns first response; Incident Owner owns escalation; Application
Owner owns state corrections.

## Browser-wallet UX verification

This is a testnet-only checklist. It does not authorize a transaction and must
not be used to enable a server-side real-execution gate. The browser-visible
`real` mode selects a flow; server authorization remains a separate safety
control.

### Safe pre-authorization check

With real execution still disabled, an Owner can open **Wallet payment** and
select **Verify wallet & sign**. The expected result is:

- SettleFlow explains that payments are not enabled in this environment.
- No wallet signature prompt appears.
- No `Release` or `TransactionProof` row is created.
- The UI offers no retry or new-payment action.

This check is safe to repeat because it is read-only and fail-closed.

### Authorized bounded-test checks

Only run the following checks after every requirement in
`STAGING_BOUNDED_TRANSACTION_GATE.md` has been verified and an authorized
operator has approved exactly one bounded staging transaction. Use a dedicated
staging EOA and a small approved test amount.

| Scenario | Expected user-visible result | Required safety outcome |
| --- | --- | --- |
| Active wallet account differs from the authenticated Owner EOA | SettleFlow stops before signing and identifies that the account must be switched. | No transaction is submitted; inspect the release/proof records before any retry. |
| Wallet signature is cancelled before broadcast | **Payment wasn’t sent** explains that a new attempt may be started after the user is ready. | The failed pre-broadcast attempt is recorded; retry eligibility remains server-controlled. |
| Wallet/network is unavailable before broadcast | **Check your wallet, then try again** explains that no payment was sent. | Confirm Arc Testnet/network status before retrying. |
| Wallet result is unknown or a hash is absent | **We’re checking this payment** opens automatically. | Do not sign or retry; reconcile the existing payment using the read-only workflow above. |

If any result differs, stop the test, leave real execution disabled, preserve
the release/proof records, and follow the core reconciliation procedures.
