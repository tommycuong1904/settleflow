# SettleFlow Operations Runbook

Status: Phase 4A planning baseline

## Purpose

This index defines the minimum controls for a controlled staging path. Runtime code and Prisma remain the implementation authority; these runbooks define operational procedure and ownership.

## Operational status

- Implemented in code: authentication, workspace authorization, persistence, release/proof states, retry, and mode-aware Arc execution.
- Verified operationally: local/test and database-backed verification only; no live payment verification.
- Required before real Arc staging: isolated infrastructure, secrets, wallet/funding controls, monitoring, reconciliation, incident response, and written approval.
- Required before production: all staging gates plus tested recovery, production controls, and explicit production approval.

REAL ARC TRANSACTIONS ARE NOT AUTHORIZED BY THIS DOCUMENT.

## Environment model

Development, test, staging, and production MUST use separate application configuration, databases, authentication secrets, webhook destinations, and (where applicable) wallets and signing keys. Test database operations are restricted to `NODE_ENV=test` and local `*_test` databases.

| Environment | Application | Database | Auth secret | Arc mode | RPC | Signing key | Webhook |
|---|---|---|---|---|---|---|---|
| Development | local Next.js | development DB | development-only | `demo` default | Arc testnet defaults | none | local/test destination |
| Test | test runner | local `*_test` DB | test-only | non-executing | must not be contacted | none | mocked only |
| Staging | separate deployment | independently provisioned staging DB | unique staging secret | `demo` until Gate 3 | approved testnet endpoint | dedicated staging key | staging-only destination |
| Production | separate deployment | independently provisioned production DB | unique production secret | explicit approval only | approved endpoint | production custody | production-only destination |

Actual external values and provisioning are **NOT YET APPROVED** and must be supplied by infrastructure operators.

## Required runbooks

- `DEPLOYMENT_RUNBOOK.md`
- `DATABASE_MIGRATION_RECOVERY_RUNBOOK.md`
- `SECRETS_AND_KEY_MANAGEMENT_RUNBOOK.md`
- `ARC_STAGING_SAFETY_RUNBOOK.md`
- `RELEASE_RECONCILIATION_RUNBOOK.md`
- `WEBHOOK_ISOLATION_POLICY.md`
- `INCIDENT_RESPONSE_RUNBOOK.md`

## Ownership

Use role ownership only: Application Owner, Release Operator, Database Operator, Infrastructure Operator, Security/Key Custodian, and Incident Owner. Unassigned ownership is **OWNER TO BE ASSIGNED**.

## Safety gates

Gate 0: these runbooks, ownership, environment matrix, and explicit no-transaction boundary exist. Gate 1: staging resources are isolated. Gate 2: deployment, auth, migration, webhook, monitoring, reconciliation, and incident procedures are exercised without a transaction. Gate 3: transaction parameters and written approval exist. Gate 4: exactly one bounded staging transaction is executed. Gate 5: outcome is reconciled and documented.

## Checklists

Before staging: verify target environment, database identity, secrets, webhook destination, execution mode, monitoring, and rollback contacts. After staging: verify deployment health, persisted release/proof state, logs, reconciliation, and incident notes. No checklist item authorizes a transaction by itself.

## Change approval

Documentation changes are DOCUMENTATION-ONLY. Infrastructure changes require Infrastructure Operator approval. Production-code changes require explicit production-code approval. Any real Arc action is `REAL-ARC/STAGING — REQUIRES EXPLICIT SAFETY GATE`.

## Production boundary

Passing tests or having a live executor does not establish production readiness. Production requires independent review of custody, limits, monitoring, reconciliation, recovery, and compliance obligations.
