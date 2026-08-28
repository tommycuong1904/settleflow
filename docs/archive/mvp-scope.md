# SettleFlow MVP Scope

## Product Definition

SettleFlow is an Arc-native USDC payout workflow for crypto teams.

It helps teams pay contributors by milestone, with approval-gated release and transparent settlement tracking.

## Core User

Primary user:
- founder
- ops lead
- PM
- team lead in a crypto-native team

Secondary user:
- contributor receiving milestone-based payment

## Core Problem

Crypto teams frequently manage contributor payouts manually:
- chat-based approvals
- spreadsheet tracking
- manual wallet transfers
- poor visibility into payout status

This makes payouts slow, inconsistent, and hard to track.

## MVP Goal

Deliver one complete workflow:
**create payout → define milestones → review work → approve → release USDC → show settlement state**

## In Scope

### 1. Payout Creation
- create a contributor payout
- set total payout amount
- split payout into milestones

### 2. Milestone Tracking
- milestone descriptions
- milestone amount per step
- status tracking:
  - pending
  - submitted
  - approved
  - released

### 3. Review Workflow
- mark work as submitted
- reviewer can approve or reject
- release only allowed after approval

### 4. Release Flow
- payout release action
- settlement state
- transaction/proof area

### 5. Arc Narrative
- Arc as settlement rail
- USDC as payment asset
- App Kit Send as payment execution path

## Out of Scope

- freelancer marketplace
- payroll suite
- recurring payroll
- multi-chain funding
- autonomous agent operations
- advanced treasury analytics
- enterprise-grade permissions
- full accounting/compliance workflows

## MVP Success Criteria

A user can understand and demo:
1. how a payout is created
2. how milestones structure payment
3. how approval gates release
4. how Arc/USDC power settlement
5. why this is better than manual wallet transfers

## Checkpoint 2 Success Criteria

Before Checkpoint 2, the repo should show:
- credible product direction
- clean repository structure
- working or near-working UI flow
- clear Arc / USDC / App Kit positioning
- realistic path to final MVP
