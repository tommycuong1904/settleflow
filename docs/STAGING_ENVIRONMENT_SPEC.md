# Staging Environment Specification

Status: **DRAFT** — provisioning not complete.

This document defines the minimum configuration for a functioning staging environment. No real execution is authorized. No production resources are referenced.

---

## Application

| Property | Value |
|---|---|
| Platform | Vercel (Preview deployment) |
| Integration | GitHub push → auto-deploy |
| Branch isolation | Preview per feature branch, staging branch pinned to a dedicated branch (e.g., `staging`, `release/*`) |
| Production DB | NOT referenced |
| Production secrets | NOT used |

### Build command (from `vercel.json`)

```text
prisma migrate deploy && prisma generate && npm run build
```

This command is env-agnostic — it reads `DATABASE_URL` and other env vars at build/runtime from the Vercel Preview environment config.

---

## Database

| Property | Value |
|---|---|
| Engine | PostgreSQL 15+ |
| ORM | Prisma 6 |
| Host | Independent instance (provider TBD — Vercel Postgres, Neon, Supabase, self-hosted, etc.) |
| Name | Must NOT end in `_test` |
| Credentials | Staging-specific (not development, not production) |
| `DATABASE_URL` | Points only to staging PostgreSQL instance |

### Migration policy

- `prisma migrate deploy` is the only migration command allowed against staging.
- Never use `prisma migrate dev`, `prisma migrate reset`, or `prisma db push` against staging.
- After initial deployment, verify with `prisma migrate status`.

---

## Required environment variables

Placeholder values shown. Real values must be generated and stored in the Vercel staging Preview environment. **Never commit real values.**

| Variable | Staging value | Notes |
|---|---|---|
| `DATABASE_URL` | `<STAGING_POSTGRES_URL>` | Independent staging PostgreSQL. NOT `*_test` |
| `SETTLEFLOW_AUTH_SECRET` | `<STAGING_ONLY_SECRET>` | Unique 64+ char hex. Not development, not production |
| `ARC_SERVER_PRIVATE_KEY` | `<STAGING_TESTNET_PRIVATE_KEY>` | Dedicated Arc Testnet EOA. No real funds |
| `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION` | `disabled` | MUST remain disabled until bounded transaction gate is satisfied |
| `NEXT_PUBLIC_ARC_EXECUTION_MODE` | `mock` | Mock mode until final safety gate approval |
| `NEXT_PUBLIC_ARC_CHAIN_ID` | `5042002` | Arc Testnet |
| `NEXT_PUBLIC_ARC_RPC_URL` | `<APPROVED_ARC_TESTNET_RPC>` | Approved Arc Testnet RPC endpoint |
| `NEXT_PUBLIC_ARC_EXPLORER_URL` | `<APPROVED_ARC_TESTNET_EXPLORER>` | Approved Arc Testnet explorer |
| `SETTLEFLOW_WEBHOOK_URL` | `<STAGING_ONLY_WEBHOOK_OR_DISABLED>` | Staging-only destination. Leave unset to disable |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `<STAGING_ONLY_GOOGLE_CLIENT_ID>` | Separate Google OAuth credential for staging origin |
| `NEXT_PUBLIC_CIRCLE_APP_ID` | `<STAGING_ONLY_CIRCLE_APP_ID>` | Only if `circle_wallet` mode is tested |

### Environment variable isolation rules

1. **No production secrets** — every variable must be staging-specific.
2. **No NEXT_PUBLIC secrets** — `ARC_SERVER_PRIVATE_KEY`, `SETTLEFLOW_AUTH_SECRET`, `DATABASE_URL` are server-only and must never be exposed as `NEXT_PUBLIC_*`.
3. **Real execution remains disabled** — `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION=disabled` and `NEXT_PUBLIC_ARC_EXECUTION_MODE=mock` until the bounded transaction gate is explicitly satisfied.
4. **Webhook isolation** — staging webhook destination must be separate from production. Leave unset to disable webhooks entirely during initial staging.

---

## Staging wallet

| Property | Value |
|---|---|
| Key | `ARC_SERVER_PRIVATE_KEY` — dedicated staging-only EOA |
| Network | Arc Testnet (chain 5042002) |
| Token | USDC (native on Arc) |
| Funding | Testnet USDC only. No real funds. Sufficient for gas |
| Verification | Derive wallet address from private key; confirm explorer shows correct address |

---

## Migration readiness

All 4 migrations are present in `prisma/migrations/`:

| Migration | Purpose |
|---|---|
| `20260807140115_init` | Initial schema |
| `20260827024523_add_workspace_webhook_settings` | Workspace webhook URL setting |
| `20260828145326_add_contributor_created_by` | Contributor creator tracking |
| `20260831000000_add_active_release_per_milestone` | One-active-release-per-milestone partial unique index |

Local dev DB is behind by the latest migration (not applied). Staging deployment must run `prisma migrate deploy` to apply all pending migrations.

---

## Verification checklist (before staging is considered ready)

- [ ] Staging PostgreSQL instance created and reachable
- [ ] All required env vars configured in Vercel Preview environment
- [ ] `prisma migrate deploy` completed successfully
- [ ] `prisma migrate status` confirms all migrations applied
- [ ] Auth works (staging Google OAuth, staging auth secret)
- [ ] Read-only payout/milestone flows work
- [ ] Release queue works in mock mode
- [ ] Webhook destination is staging-only (or disabled)
- [ ] No production values present in any env var
- [ ] `SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION` is `disabled`
- [ ] `NEXT_PUBLIC_ARC_EXECUTION_MODE` is `mock`