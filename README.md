# SettleFlow

**Arc-native USDC payout workflow for crypto teams.**

SettleFlow helps crypto teams create milestone-based contributor payouts, review submitted work, and release USDC only after approval. Instead of ad hoc wallet transfers, SettleFlow turns contributor compensation into a programmable settlement workflow on Arc.

## Problem

Crypto teams often manage contributor payments through chats, spreadsheets, and manual wallet transfers. This creates poor visibility, inconsistent approval flow, and weak control over when funds should actually be released.

## Solution

SettleFlow turns contributor compensation into a milestone-based payout workflow on Arc:
- create contributor payouts in USDC
- split work into milestones
- review submitted work
- release funds only after approval
- track settlement status transparently

## Why Arc

SettleFlow is built around Arc because the product depends on stablecoin-native settlement.
- **Arc** acts as the settlement rail
- **USDC** is the core payment and settlement layer
- **App Kit Send** is the intended payout execution path

This makes contributor payouts more legible, controllable, and onchain-native than manual wallet transfers.

## Implemented Checkpoint 2 State

The repository now includes:
- landing page for product framing
- dashboard route for payout operations visibility
- payout creation route with milestone split preview
- payout detail route with review, release, and settlement proof blocks
- reusable milestone, proof, stat, and section components
- mock contributors, payouts, milestones, and transaction proof data
- Arc integration scaffold under `lib/arc/`

## MVP Scope

The MVP focuses on one core workflow:
1. Create a payout
2. Define milestones
3. Track contributor submission state
4. Approve or reject milestone completion
5. Release USDC payout
6. Show settlement status / transaction proof

## Current Progress

- Product direction finalized around milestone-based contributor payouts
- DeFi track positioning selected
- MVP scope defined
- Repository structure and implementation plan established
- Checkpoint 2 UI scaffold implemented and verified with real build
- Local preview server verified over HTTP
- Core UI flow and Arc integration scaffolding in place

## Planned Stack

- **Frontend:** Next.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data layer:** local/mock state first
- **Blockchain target:** Arc Testnet
- **Money layer:** USDC
- **Payments integration:** App Kit Send

## Local Development

```bash
npm install
npm run dev -- -H 0.0.0.0
```

Preview is available locally at:
- `http://127.0.0.1:3000/`

Verified screenshot evidence captured during review pass:
- landing: `/root/.hermes/cache/screenshots/browser_screenshot_5ca69c2016be4b78ac1981e328c5bdde.png`
- dashboard: `/root/.hermes/cache/screenshots/browser_screenshot_bf8760ef702642f9914b935a352af01c.png`
- payout detail: `/root/.hermes/cache/screenshots/browser_screenshot_989a5d534bf0423bb48265da689e9b02.png`

## Verified Routes

- `/`
- `/dashboard`
- `/payouts/new`
- `/payouts/payout-1`

## Repository Structure

- `app/` — app routes and pages
- `components/` — reusable UI components
- `lib/` — models, mock data, Arc helpers, utilities
- `docs/` — product, architecture, and checkpoint notes
- `public/` — static assets

## Roadmap

### Checkpoint 2
- repository link
- progress summary
- working UI flow for milestone payouts
- integration-ready Arc payment architecture

### Final Submission
- functional MVP deployed on Arc
- public code repository
- 3-minute video pitch + demo
- submission deck

## Track

- **Build on Arc — Overview**
- **DeFi Track**
