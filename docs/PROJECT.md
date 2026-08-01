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
The current repository implements a frontend-first demo of the product with:
- landing page
- dashboard
- create payout flow
- payout detail flow
- mock contributors, payouts, milestones, and settlement proof
- Arc integration scaffolding

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
- the product demo UI is implemented
- the app is powered by mock data
- no real backend or database has been confirmed in this repository
- Arc send integration is scaffolded but not live
- no authentication flow has been confirmed

## Out of Scope for the Current Repository State
The inspected repository does not currently confirm implementation of:
- production-grade backend services
- real payout persistence
- auth / permissions
- live onchain release execution
- automated test coverage

## Success Definition for the Current Stage
The repository should clearly demonstrate:
- what SettleFlow is
- who it is for
- how the payout workflow works
- why approval-gated release matters
- how Arc and USDC fit into the settlement story
