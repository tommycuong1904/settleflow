# Deployment Runbook

## Current deployment model

Vercel invokes `prisma migrate deploy && prisma generate && npm run build`. Migration runs against `DATABASE_URL`, then Prisma Client is generated, then Next.js builds. No backup system is established by this repository.

## Environment Configuration Matrix (Preview & Staging)

### Required Core Variables
- `DATABASE_URL`: PostgreSQL connection string. Must point to an independently provisioned Preview/Staging database instance.
- `SETTLEFLOW_AUTH_SECRET`: High-entropy secret string (min 32 bytes) used for signing and verifying HMAC-SHA256 session cookies (`sf_session`). Fails closed in production if missing.

### Optional Arc Protocol Variables (Safe Defaults Built-in)
- `NEXT_PUBLIC_ARC_EXECUTION_MODE`: `mock` | `demo` | `real` (default: `demo`). *Must remain `demo` or `mock` for staging verification.*
- `NEXT_PUBLIC_ARC_CHAIN_ID`: Arc Testnet Chain ID (default: `5042002`).
- `NEXT_PUBLIC_ARC_RPC_URL`: Arc Testnet RPC endpoint (default: `https://rpc.testnet.arc.io`).
- `NEXT_PUBLIC_ARC_EXPLORER_URL`: Block explorer URL (default: `https://testnet.arcscan.app`).
- `NEXT_PUBLIC_USDC_ADDRESS`: Native/Bridged USDC contract address on Arc Testnet (default: `0x3600000000000000000000000000000000000000`).

### Safety & Execution Authorization Gates
- `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION`: Must remain `disabled` or omitted on Staging. Real onchain fund movement is strictly locked unless explicitly authorized.
- `ARC_SERVER_PRIVATE_KEY`: Omitted by default. Never configure with real/mainnet private keys.

### Authentication & Integration (Optional)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth Web Client ID for Google Smart Account login rail.
- `SETTLEFLOW_WEBHOOK_URL`: Optional global fallback webhook endpoint for workspace event notifications.

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
