# SettleFlow — Checkpoint 2 Submission Draft

## One-line description
SettleFlow is an Arc-native USDC payout workflow for crypto teams, designed to turn contributor payments into milestone-based, approval-gated settlement flows.

## What is implemented right now
- Product landing page
- Payout dashboard
- Payout creation screen
- Payout detail screen with milestone review and settlement proof
- Reusable UI components for milestone status, review controls, release panel, stat cards, and transaction proof
- Mock data for contributors, payouts, milestones, and transaction proofs
- Arc integration scaffold for config, types, and send flow placeholder

## Why this fits Arc / DeFi
SettleFlow uses Arc as the settlement rail and USDC as the money layer. The key action in the product is releasing milestone payouts in USDC only after approval, which makes Arc and stablecoin settlement core to the product rather than cosmetic.

## Current proof points
- Production build succeeds
- Core routes verified in the repository:
  - `/`
  - `/dashboard`
  - `/payouts/new`
  - `/payouts/payout-1`
- Checkpoint UI flow has been validated across landing, dashboard, payout creation, and payout detail views
- Arc integration path is scaffolded and ready for final MVP wiring

## Demo story
1. Start at landing page to frame the product
2. Open dashboard to show payout operations and review queue
3. Open payout detail to show submitted / released / pending milestone states
4. Highlight settlement proof and Arc / USDC release narrative
5. Open create payout screen to show how new milestone payouts are structured

## What remains after Checkpoint 2
- connect release action to real App Kit Send flow
- make state transitions interactive beyond static/mock presentation
- deploy final MVP on Arc
- package final demo and pitch assets
