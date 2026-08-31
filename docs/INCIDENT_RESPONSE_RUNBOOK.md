# Incident Response Runbook

For every incident: detect, freeze/contain, investigate with read-only evidence, recover through the owning role, verify, document, and escalate to Incident Owner.

## Triggers

- Database migration failure or wrong-target suspicion: stop deployment and migrations; verify identity and schema state; restore only through the Database Operator.
- Authentication secret failure: stop affected deployment; do not weaken fail-closed behavior; rotate/revoke through Security/Key Custodian.
- Signing-key exposure suspicion: freeze releases, revoke/isolate key, inspect possible activity, and escalate immediately.
- RPC outage: keep releases pending; do not infer failure or retry.
- Ambiguous transaction or duplicate-release suspicion: freeze all retries; independently reconcile before any new transaction.
- Insufficient funds: freeze execution and obtain explicit funding approval.
- Webhook misconfiguration: disable destination, verify environment isolation, and replay only after approval.
- Staging/production isolation failure: stop deployment and settlement, revoke exposed access, and perform an incident review.

If there is uncertainty about whether funds moved, DO NOT issue another transaction until the state is independently reconciled.
