# SettleFlow

**Arc-native USDC payout workflow for crypto teams.**

SettleFlow helps crypto teams create milestone-based contributor payouts, review submitted work, and release USDC only after approval. Instead of ad hoc wallet transfers, SettleFlow turns contributor compensation into a programmable settlement workflow on Arc.

---

## Problem

Crypto teams often manage contributor payments through chats, spreadsheets, and manual wallet transfers. This creates poor visibility, inconsistent approval flow, and weak control over when funds should actually be released.

## Solution

SettleFlow turns contributor compensation into a milestone-based payout workflow on Arc:

1. Create a contributor payout and define milestones
2. Contributor submits completed work with proof (GitHub PR, Figma, Loom video)
3. Reviewer approves or rejects each milestone
4. Owner releases USDC on Arc Testnet — only after approval
5. Settlement proof is generated with Arcscan transaction link
6. Real-time Discord / Slack notification dispatched at each step

## Why Arc

- **Arc** acts as the settlement rail
- **USDC** is the core payment and settlement layer (native on Arc)
- **Circle App Kit** is the payout execution path for browser wallets

---

## Quick Start

### Prerequisites

| Tool              | Version |
| ----------------- | ------- |
| Node.js           | ≥ 20    |
| npm               | ≥ 10    |
| PostgreSQL        | ≥ 15    |
| MetaMask or Rabby | Latest  |

### 1. Clone & install dependencies

```bash
git clone https://github.com/your-org/settleflow.git
cd settleflow
npm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/settleflow"

# Arc Testnet (pre-filled, no changes needed for local dev)
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.io
NEXT_PUBLIC_ARC_EXPLORER_URL=https://testnet.arcscan.app

# Circle App Kit (optional — only needed for live USDC transfers)
NEXT_PUBLIC_CIRCLE_APP_ID=your_circle_app_id

# Webhook Notifications (optional — Discord, Slack, or custom endpoint)
SETTLEFLOW_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 3. Set up the database

```bash
# Run migrations
npx prisma migrate dev

# Seed with sample workspace, users, and payout data
npx prisma db seed
```

### 4. Start the development server

```bash
npm run dev
```

App runs at **[http://localhost:3000](http://localhost:3000)**

### 5. Connect Arc Testnet to MetaMask

Either:

- Open the app → **Connect Wallet** → **"Add / Switch Arc Testnet"**
- Or go to `/settings` → **"Add to MetaMask"**

Network parameters:
| Field | Value |
|---|---|
| Network Name | Arc Testnet |
| Chain ID | `5042002` |
| RPC URL | `https://rpc.testnet.arc.io` |
| Currency | USDC |
| Explorer | `https://testnet.arcscan.app` |

### 6. Get testnet USDC

In the app, click the **USDC balance badge** in the header → **"Request Testnet USDC from Faucet"**

---

## Running Tests

```bash
# Unit tests (payout state machine — 16 tests)
node --import tsx --test lib/repositories/payout-state-machine.test.mts

# Lint
npm run lint

# Production build check
npm run build
```

---

## App Routes

| Route           | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `/`             | Landing page — product overview                              |
| `/dashboard`    | Operator dashboard — KPIs, active payouts, pending approvals |
| `/payouts`      | All payouts list                                             |
| `/payouts/new`  | Create a new payout with milestones                          |
| `/payouts/[id]` | Payout detail — review, release, settlement proof            |
| `/contributors` | Contributors list and payout history                         |
| `/activity`     | Full activity log — all events across the workspace          |
| `/settings`     | Workspace config, Arc network, webhook notifications         |

### API Routes

| Route                                 | Method    | Description                        |
| ------------------------------------- | --------- | ---------------------------------- |
| `/api/v1/payouts`                     | GET, POST | List or create payouts             |
| `/api/v1/payouts/[id]`                | GET       | Payout detail                      |
| `/api/v1/payouts/[id]/activate`       | POST      | Activate a draft payout            |
| `/api/v1/milestones/[id]/submit`      | POST      | Submit a milestone deliverable     |
| `/api/v1/milestones/[id]/approve`     | POST      | Approve a submitted milestone      |
| `/api/v1/milestones/[id]/reject`      | POST      | Reject a milestone with feedback   |
| `/api/v1/milestones/[id]/release`     | POST      | Queue a USDC release               |
| `/api/v1/releases/[id]/proof/refresh` | POST      | Refresh transaction proof from Arc |
| `/api/v1/webhooks/test`               | POST      | Test a Discord/Slack webhook       |

---

## Repository Structure

```
settleflow/
├── app/
│   ├── (app)/          # Authenticated app routes
│   │   ├── dashboard/
│   │   ├── payouts/
│   │   ├── contributors/
│   │   ├── activity/
│   │   └── settings/
│   ├── (marketing)/    # Public landing page
│   └── api/v1/         # REST API routes
├── components/
│   ├── milestones/     # MilestoneRow, SubmitMilestoneDialog, ReviewControls
│   ├── payouts/        # PayoutDetail, ReleaseShell, ReceiptModal
│   ├── dashboard/      # KPI stats, wallet gate
│   └── shared/         # AppHeader, AppSidebar, AuthModal, RoleSwitcher
├── lib/
│   ├── arc/            # Arc Testnet config, browser wallet, onchain helpers
│   ├── context/        # WalletContext, ToastContext
│   ├── models/         # TypeScript domain types
│   ├── notifications/  # Webhook dispatcher (Discord, Slack, custom)
│   ├── repositories/   # Database-backed payout, milestone, release operations
│   └── runtime/        # ProductContext, policy, server helpers
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Demo workspace seed
└── docs/               # Architecture, conventions, demo guide, current state
```

---

## Workflow Overview

```
Owner creates Payout (draft → active)
    └─→ Contributor submits Milestone + Deliverable proof
            └─→ Reviewer Approves or Rejects
                    └─→ Owner Releases USDC on Arc Testnet
                            └─→ Settlement Proof generated (Arcscan link)
                                    └─→ Discord / Slack Webhook notification
```

Role switching is available in the top-right header for demo and local testing.

---

## Stack

| Layer              | Technology                                    |
| ------------------ | --------------------------------------------- |
| Framework          | Next.js 16 (App Router)                       |
| Language           | TypeScript                                    |
| Styling            | Tailwind CSS                                  |
| Database           | PostgreSQL + Prisma                           |
| Blockchain         | Arc Testnet (Chain ID `5042002`)              |
| Settlement token   | USDC (native on Arc)                          |
| Wallet integration | Circle App Kit + Viem v2 adapter              |
| Notifications      | Webhook dispatcher (Discord, Slack, Telegram) |

---

## Demo Guide

For a step-by-step walkthrough of the full payout workflow, see **[`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md)**.

---

## Track

- **Build on Arc — Overview**
- **DeFi Track**
