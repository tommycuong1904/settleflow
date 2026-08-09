# PROJECT

## Name
SettleFlow

## One-line Summary
SettleFlow is an Arc-native USDC payout workflow for crypto teams.

## Product Goal
SettleFlow is designed to turn contributor compensation into a milestone-based payout workflow instead of ad hoc wallet transfers.

## Core Problem
Crypto teams often manage contributor payouts through chats, spreadsheets, and manual transfers. This creates:
- weak visibility into payout state
- inconsistent approval flow
- unclear release timing
- poor settlement traceability

## Core Solution
SettleFlow structures payouts around a single workflow:
1. create a payout
2. define milestones
3. review submitted work
4. approve or reject milestone completion
5. release USDC after approval
6. show settlement proof

## Current Product Shape
The current repository is being advanced as a real MVP with:
- landing page
- dashboard
- create payout flow
- payout detail flow
- repository/API-backed payout, milestone, release, and proof state transitions
- Arc integration scaffolding with a real execution boundary
- a seeded-role product-context boundary for owner / reviewer / contributor workflow testing

## Primary User
- founder
- operations lead
- PM
- team lead in a crypto-native team

## Secondary User
- contributor receiving milestone-based payment

## Core Workflow
- Create payout
- Split payout into milestones
- Track submission state
- Review milestone work
- Approve before release
- Release USDC
- Attach or display settlement proof

## Current Routes
- `/` — landing page
- `/dashboard` — payout operations overview
- `/payouts/new` — create payout
- `/payouts/[id]` — payout detail

## Current State
At the time of writing:
- the core product UI is implemented and is being treated as the real MVP surface
- the repository now contains database-backed read/write paths for the payout workflow
- auth/session is still incomplete and remains the main product gap
- core workflow mutations now resolve actor identity from request product context rather than client body actor IDs
- Arc send integration is scaffolded behind an execution boundary but is not yet verified as production-safe live settlement
- legacy mock/demo artifacts still exist and should be treated as migration debt, not product direction

## Out of Scope for the Current Repository State
The repository still does not confirm full implementation of:
- production-grade auth/session infrastructure
- production-safe live onchain release execution
- complete operational hardening for wallet/key management
- comprehensive automated test coverage

## Success Definition for the Current Stage
The repository should now move toward proving:
- a real payout can be created and read back from persistence
- milestone review and release state transitions work through the application stack
- permission boundaries are explicit enough for a usable MVP
- Arc and USDC remain central to the settlement path without overstating live execution readiness
