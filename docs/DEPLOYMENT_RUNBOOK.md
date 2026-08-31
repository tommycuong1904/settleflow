# Deployment Runbook

## Current deployment model

Vercel invokes `prisma migrate deploy && prisma generate && npm run build`. Migration runs against `DATABASE_URL`, then Prisma Client is generated, then Next.js builds. No backup system is established by this repository.

## Environment separation

Each Vercel environment MUST use an independently provisioned database and environment-scoped secrets. Never assume a variable name proves environment identity. Verify database host, database name, and application environment before deployment.

## Preconditions

The Release Operator confirms approved commit, clean checks, migration owner, target environment, database identity, secret presence (without printing values), webhook destination, and rollback contact. The Database Operator confirms a provider-verified backup before production use.

## Deployment

Deploy through the approved platform workflow. `prisma migrate deploy` is the only deployment migration operation. Do not use reset, push, or development migration commands against staging or production.

## Verification

Check deployment logs for migration/build success, application health, authenticated read paths, representative non-payment workflow, and absence of secret values in logs. Verify database migration status using approved read-only checks.

## Failure and recovery

Stop rollout on migration or build failure. Preserve logs and identify whether schema state is known. Prisma migrations are not automatically reversible; application rollback may not reverse schema/data changes. Restore from a tested provider-specific backup only under Database Operator ownership, then reconcile application and schema versions.

## Ownership

Infrastructure Operator owns platform configuration; Database Operator owns migration/backup decisions; Release Operator owns release approval; Application Owner owns compatibility.
