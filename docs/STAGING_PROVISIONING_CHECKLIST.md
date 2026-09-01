# Staging Provisioning Checklist

**Status:** NOT PROVISIONED

This checklist covers everything needed before staging is considered ready. Real execution is NOT authorized at any point in this checklist.

---

## Infrastructure

- [ ] **Independent staging PostgreSQL created**
  - Provider: (TBD — Vercel Postgres, Neon, Supabase, or self-hosted)
  - Database name: (must NOT end in `_test`)
  - URL: stored in Vercel Preview environment as `DATABASE_URL`
- [ ] **Staging DATABASE_URL stored in Vercel Preview environment**
  - Key: `DATABASE_URL`
  - Value: staging PostgreSQL connection string
- [ ] **Vercel Preview deployment identified**
  - Existing Vercel project supports Preview deployments
  - Branch: `staging` (or dedicated branch) pinned for staging
  - No local Vercel credentials available — operator must configure via Vercel dashboard
- [ ] **Staging Google OAuth client configured**
  - Authorized origin: staging Vercel Preview URL
  - Authorized redirect URI: `https://<staging-url>/api/v1/auth/google`
  - Key: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- [ ] **Staging webhook destination configured or explicitly disabled**
  - Key: `SETTLEFLOW_WEBHOOK_URL`
  - Destination: staging-only Discord/Slack channel or left unset to disable

---

## Security

- [ ] **Unique SETTLEFLOW_AUTH_SECRET generated**
  - 64+ character hex string
  - Stored in Vercel Preview environment (server-only)
- [ ] **Dedicated Arc Testnet ARC_SERVER_PRIVATE_KEY generated**
  - New EOA for staging only — no real funds
  - Stored in Vercel Preview environment (server-only)
- [ ] **Staging wallet address independently verified**
  - Derive address from private key
  - Confirm on Arc Testnet explorer
- [ ] **Production signing key never reused**
  - Staging `ARC_SERVER_PRIVATE_KEY` is unique to staging
- [ ] **Production database never referenced**
  - Staging `DATABASE_URL` points to staging PostgreSQL only
- [ ] **SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION remains disabled**
  - Value: `disabled` (not `enabled`)
- [ ] **NEXT_PUBLIC_ARC_EXECUTION_MODE remains mock**
  - Value: `mock` (not `real`)

---

## Arc Testnet

- [ ] **Chain ID 5042002 verified**
  - `NEXT_PUBLIC_ARC_CHAIN_ID=5042002`
- [ ] **Approved RPC verified**
  - `NEXT_PUBLIC_ARC_RPC_URL` set to approved testnet endpoint
- [ ] **Explorer verified**
  - `NEXT_PUBLIC_ARC_EXPLORER_URL` set to approved testnet explorer
- [ ] **Testnet USDC funding source identified**
  - Faucet or exchange source for testnet USDC
- [ ] **Small transaction limit documented**
  - Maximum amount for any staging transaction: (TBD, small amount)

---

## Database

- [ ] **Staging DB is not `*_test`**
  - Database name: (must not end in `_test`)
- [ ] **`prisma migrate deploy` completed against staging only**
  - Run against staging DATABASE_URL only
  - Never run against development or production
- [ ] **Migration status verified**
  - `prisma migrate status` confirms all 4 migrations applied
- [ ] **Release/TransactionProof/ActivityLog rows inspectable**
  - Read-only access to confirm records are persisted

---

## Application

- [ ] **Auth works**
  - Google OAuth sign-in with staging client ID
  - Session cookie issued and verified
- [ ] **Read-only payout/milestone flows work**
  - Payout list, detail, and milestone views load correctly
- [ ] **Release queue works in mock mode**
  - Release milestone action queues a release record without sending a transaction
- [ ] **Webhook destination is staging-only**
  - Notifications go to staging-only channel (or disabled)
- [ ] **No production values present**
  - Verify all env vars in Vercel Preview environment are staging-specific

---

## Final transaction gate

**Do not proceed past this point until staging is fully provisioned and verified.**

- [ ] Written bounded transaction plan approved (see `STAGING_BOUNDED_TRANSACTION_GATE.md`)
- [ ] Recipient explicitly approved
- [ ] Amount explicitly approved
- [ ] Source wallet explicitly approved
- [ ] Network explicitly approved
- [ ] RPC explicitly approved
- [ ] USDC contract explicitly approved
- [ ] Funding/fee limit approved
- [ ] Real execution authorization explicitly approved by operator
- [ ] Only then may `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION` be set to `enabled`