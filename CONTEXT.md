# CONTEXT — Agent Quick-Start (SettleFlow)

> Read this file first. It is the single high-signal orientation for any new model/agent.
> Task routing rules live in `AGENTS.md`; authoritative live-state numbers live in `docs/CURRENT_STATE.md`.

## What this project is
SettleFlow turns contributor compensation into a **milestone-based USDC payout workflow** for crypto teams.
It is a full-stack Next.js app: create payout → define milestones → submit work → approve → release USDC on **Arc Testnet** → retain onchain proof.

## Stack
- **Next.js 16 / React 19 / TypeScript** (App Router; Route Handlers under `app/api/v1/*`)
- **PostgreSQL + Prisma** — runtime data (repository/API-backed). `lib/data/` contains transitional mocks only.
- **Arc Testnet** (chain `5042002`), **USDC native**; **viem** for onchain work
- **Auth (Phase 4)**: JWT session cookie + request/session boundary + DB `User`/`WorkspaceMember` → product context; anonymous mutations rejected with `401 { error: "AUTH_REQUIRED" }`
- **Release execution (Phase 6)**: `lib/arc/release-executor.ts`
  - `circle_wallet` → server-side EOA from `ARC_SERVER_PRIVATE_KEY` sends real USDC (sync), persists proof + source wallet
  - `browser_wallet` → fails explicitly on the server (browser signs via wallet adapter)

## Key commands
| Command | Meaning |
| --- | --- |
| `npm run dev` | Dev server (served at `http://localhost:3001` in this workspace) |
| `node --import tsx --test 'lib/**/*.test.mts'` | Full unit suite (current count: see `docs/CURRENT_STATE.md`) |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npx prisma migrate dev` / `npx prisma db push` | Schema sync |

## Structure (high level)
```
app/api/v1/**         Route handlers (auth, payouts, milestones, releases, contributors, webhooks)
app/(app)/**          UI pages (dashboard, payouts, contributors, activity, settings)
components/**         React components (dashboard, milestones, payouts, shared, ui)
lib/api/**            Request validation / schema
lib/repositories/**   Prisma data access
lib/arc/**            Arc config, release-executor, onchain helpers
lib/auth/**           Session, smart-account
lib/notifications/**  Webhook dispatcher (Discord/Slack/custom)
lib/runtime/**        Runtime utilities
```

## Doc map (`docs/`)
- `PROJECT.md` — product vision (why/what)
- `ARCHITECTURE.md` — how it fits together
- `CONVENTIONS.md` — code/test/doc conventions
- `CURRENT_STATE.md` — **what is true right now; single source of truth for live numbers**
- `DEMO_GUIDE.md` — step-by-step demo walkthrough
- `GOOGLE_OAUTH_SETUP.md` — Google OAuth client setup
- `KNOWN_ISSUES.md` — known gaps
- `FEATURE_MATRIX.md` — feature-by-feature status
- `REAL_PRODUCT_ROADMAP.md` — roadmap & phases
- `HANDOFF.md` — handoff notes + recommended next steps
- `README.md` — docs index (see also `docs/README.md`)
- `archive/` — historical/planning docs; **do not treat as current truth**

## Suggested reading order for a new model
1. `CONTEXT.md` (this file) — orientation
2. `AGENTS.md` — task routing rules
3. `docs/CURRENT_STATE.md` — current facts when a task depends on state
4. Only then the task-specific docs the chosen workflow requires

## Golden rule
Trust `docs/CURRENT_STATE.md` for live numbers. If another doc disagrees with it, the other doc is stale.
