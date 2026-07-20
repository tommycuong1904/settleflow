# SettleFlow Architecture

## Overview

SettleFlow is an Arc-native USDC payout workflow for crypto teams.

The product is designed around one focused workflow:
**create payout → define milestones → review submitted work → approve → release USDC → show settlement status**

At the Checkpoint 2 stage, the architecture is intentionally frontend-first:
- fast to build
- easy to demo
- easy to iterate
- structured to support later Arc payment integration

## Product Architecture

SettleFlow is organized into four layers:

1. **Presentation layer**
   - pages
   - layout
   - reusable UI components

2. **Workflow state layer**
   - payout data
   - milestone data
   - status transitions
   - transaction/proof state

3. **Domain model layer**
   - typed entities for payouts, milestones, contributors, and settlement proof

4. **Arc integration layer**
   - Arc configuration
   - payment execution abstraction
   - transaction result handling
   - App Kit Send integration path

## Route Architecture

- `/` — landing page and product overview
- `/dashboard` — payout overview and review queue
- `/payouts/new` — create payout flow
- `/payouts/[id]` — payout detail, milestone review, release, and proof

## Repository Structure

```text
settleflow/
├── README.md
├── .env.example
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard/page.tsx
│   ├── payouts/new/page.tsx
│   └── payouts/[id]/page.tsx
├── components/
│   ├── shared/
│   ├── dashboard/
│   ├── payouts/
│   └── milestones/
├── lib/
│   ├── arc/
│   ├── data/
│   ├── models/
│   └── utils/
├── docs/
│   ├── mvp-scope.md
│   ├── architecture.md
│   └── progress-summary-checkpoint-2.md
└── public/
```

## Domain Model

### Contributor
- `id`
- `name`
- `walletAddress`
- optional `role`

### Payout
- `id`
- `title`
- `contributorId`
- `totalAmount`
- `currency`
- `status`
- `createdAt`

### Milestone
- `id`
- `payoutId`
- `title`
- `description`
- `amount`
- `status`
- `submittedAt`
- `approvedAt`
- `releasedAt`

### TransactionProof
- `id`
- `milestoneId`
- `txHash`
- `network`
- `status`
- `explorerUrl`

## State Model

Milestone statuses:
- `pending`
- `submitted`
- `approved`
- `released`
- optional `rejected`

Key rule:
**A milestone cannot be released unless it has been approved.**

Payout-level state is derived from milestone state:
- draft
- active
- partially released
- completed

## Arc Integration Layer

SettleFlow is intentionally aligned with the Arc and Circle stack.

### Arc
Arc acts as the settlement rail:
- stablecoin-native environment
- fast settlement
- natural fit for milestone payout release

### USDC
USDC is the core money layer:
- contributor payouts
- milestone settlement
- payout visibility in a stable denomination

### App Kit Send
App Kit Send is the intended payment execution path:
- wallet-connected release action
- payout send flow
- transaction result handling

Suggested files under `lib/arc/`:
- `config.ts`
- `types.ts`
- `send.ts`

## Checkpoint 2 Success Definition

By Checkpoint 2, the repository should demonstrate:
1. a clear product direction
2. a focused MVP scope
3. a coherent route and component structure
4. visible milestone payout workflow progress
5. clear Arc / USDC / App Kit alignment
6. a credible path to final MVP

Checkpoint 2 does not need full production readiness.
It needs clear evidence of disciplined execution.
