# Database Migration & Recovery Runbook

## Database identities

Test, development, staging, and production databases MUST be independently provisioned. Test uses `SETTLEFLOW_TEST_DATABASE_URL` and the repository guard; runtime deployment uses `DATABASE_URL`. Never target a database based only on convention.

## Preconditions and approval

Record environment, host, database name, migration version, owner, and maintenance impact. Database Operator verifies identity and a restorable backup. Release Operator approves execution.

## Execution and verification

Use `prisma migrate deploy` only for deployed environments. Verify migration completion, application health, representative reads, and expected schema version. Do not run reset/drop/truncate operations.

## Failure and recovery

Stop on uncertain migration state. Preserve logs. Determine whether the migration committed before retrying. Restore using the database provider's tested procedure when required. Prisma migration history is forward-oriented; rollback is not automatic and may require a compensating migration or restore.

## Ownership

Database Operator: identity, backup, migration, restore. Infrastructure Operator: environment isolation. Application Owner: compatibility and verification. Incident Owner: escalation and record.
