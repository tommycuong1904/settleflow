# SettleFlow — Checkpoint 2 Deck Outline

## Slide 1 — Title
SettleFlow
Arc-native USDC payout workflow for crypto teams

Subtitle:
Milestone-based contributor payouts with approval-gated release and settlement proof.

## Slide 2 — Problem
Crypto teams still pay contributors through ad hoc chats, spreadsheets, and manual wallet transfers.

Pain points:
- poor visibility into payout status
- inconsistent approval flow
- weak control over when funds are actually released
- little proof or structure around milestone completion

## Slide 3 — Solution
SettleFlow turns contributor compensation into a structured payout workflow on Arc.

Core loop:
- create payout
- define milestones
- review submitted work
- approve or reject
- release USDC
- show settlement status / transaction proof

## Slide 4 — Why Arc / Why DeFi
SettleFlow is built around stablecoin-native settlement.

- Arc is the settlement rail
- USDC is the money layer
- App Kit Send is the intended payout execution path

Why it matters:
The key product action is not generic payment collection. It is conditional milestone payout release in USDC.

## Slide 5 — Product Flow
1. Team creates a contributor payout
2. Work is split into milestones
3. Contributor submits completed work
4. Reviewer approves milestone completion
5. Funds are released only after approval
6. Settlement status / transaction proof is shown transparently

## Slide 6 — What is implemented now
Current checkpoint state:
- landing page
- payout dashboard
- payout creation screen
- payout detail screen with milestone review and settlement proof
- reusable UI components
- mock data for contributors, payouts, milestones, transaction proofs
- Arc integration scaffold under `lib/arc/`

## Slide 7 — Checkpoint 2 proof
Verified proof points:
- production build succeeds
- verified routes: `/`, `/dashboard`, `/payouts/new`, `/payouts/payout-detail`
- checkpoint UI flow has been validated across landing, dashboard, payout creation, and payout detail views
- Arc integration path is scaffolded and ready for final MVP wiring

## Slide 8 — What comes next
After checkpoint 2:
- connect release action to real App Kit Send flow
- make state transitions interactive beyond static/mock presentation
- deploy final MVP on Arc
- package final pitch, demo, and submission assets
