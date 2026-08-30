# DB_SCHEMA

Archive status: implemented-by: `prisma/schema.prisma`

## Purpose
This document proposes the first persistent database schema for SettleFlow.

It is a planning artifact only. It does not add a database dependency, migration, client, or runtime behavior.

The schema is designed to move the current mock-data demo toward a persisted MVP while preserving the existing workflow:

1. create payout
2. define milestones
3. submit work
4. review submission
5. approve release
6. settle USDC
7. retain settlement proof

## Recommended Stack

### Database
**PostgreSQL**

Reasons:
- strong relational integrity for payout, milestone, review, and release relationships
- transactions for state changes and amount validation
- Decimal/numeric support for USDC amounts
- practical path to indexes, audit history, and reporting
- compatible with hosted Postgres providers without changing application architecture

### ORM
**Prisma**

Reasons:
- clear schema as a single source of truth
- generated TypeScript client fits the current TypeScript/Next.js repository
- explicit relations and enum support
- migrations are straightforward for a small MVP team
- good fit for server-side Route Handlers or Server Actions

### Why not use the current TypeScript models as the DB schema
The current models are UI contracts and intentionally minimal. They should remain presentational/domain types or be refactored into shared application types later. Database schema needs additional ownership, audit, timestamps, and lifecycle fields.

## Scope Decision: V1 vs Later

### Persist in V1
- `Workspace`
- `User`
- `WorkspaceMember`
- `Contributor`
- `Payout`
- `Milestone`
- `MilestoneSubmission`
- `MilestoneReview`
- `Release`
- `TransactionProof`
- `ActivityLog`

### Defer
- uploaded file/blob table
- notification table
- webhook delivery table
- multi-reviewer approval policies
- batch release records
- fiat or non-USDC currencies
- payout cancellation state
- organization billing/subscriptions

`ActivityLog` should be included from the first mutation phase because workflow traceability is part of the product value and is difficult to reconstruct later.

## Conventions

### IDs
Use application-generated UUIDs or Prisma-generated UUIDs for all primary keys.

External Arc transaction hashes are not primary keys. Store them as unique nullable values where appropriate.

### Timestamps
Every mutable entity has:
- `createdAt`
- `updatedAt`

Event/history entities additionally have an immutable event timestamp such as:
- `submittedAt`
- `reviewedAt`
- `occurredAt`

Store timestamps as UTC.

### Amounts
Store USDC values as PostgreSQL `numeric`, exposed in Prisma as `Decimal`.

Do not use JavaScript floating-point `number` for persisted money values.

Recommended precision for V1:
- `numeric(30, 6)` if the product only needs human-scale USDC values
- increase scale later only if protocol requirements require it

API serialization should return decimal values as strings, for example `"100.00"`.

### Statuses
Use Prisma enums for statuses that are part of workflow invariants. Do not store arbitrary status strings in core lifecycle columns.

### Soft deletion
Do not add generic soft deletion in V1. Use explicit status such as `archived` only where the product already needs it, such as contributors.

## Proposed Prisma Schema

The following is the proposed first schema shape. It is illustrative and should be validated against the chosen Prisma version before migration generation.

```prisma
enum WorkspaceMemberRole {
  owner
  ops
  reviewer
  contributor
}

enum ContributorStatus {
  active
  archived
}

enum PayoutStatus {
  draft
  active
  partially_released
  completed
}

enum MilestoneStatus {
  pending
  submitted
  approved
  released
  rejected
}

enum ReviewDecision {
  approved
  rejected
}

enum ReleaseExecutionMode {
  browser_wallet
  circle_wallet
}

enum ReleaseStatus {
  queued
  pending
  confirmed
  failed
  cancelled
}

enum TransactionProofStatus {
  pending
  confirmed
  failed
}

model Workspace {
  id                String            @id @default(uuid())
  name              String
  slug              String            @unique
  description       String?
  defaultCurrency   String            @default("USDC")
  defaultChainId    String?
  defaultUsdcAddress String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  members           WorkspaceMember[]
  contributors      Contributor[]
  payouts           Payout[]
  activityLogs      ActivityLog[]
}

model User {
  id                String               @id @default(uuid())
  displayName       String
  email             String?              @unique
  avatarUrl         String?
  walletAddress     String?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  memberships       WorkspaceMember[]
  createdPayouts    Payout[]             @relation("PayoutCreator")
  submissions       MilestoneSubmission[]
  reviews           MilestoneReview[]
  releases          Release[]
  activityLogs      ActivityLog[]
  linkedContributors Contributor[]       @relation("LinkedContributor")
}

model WorkspaceMember {
  id                String              @id @default(uuid())
  workspaceId       String
  userId            String
  role              WorkspaceMemberRole
  createdAt         DateTime            @default(now())

  workspace         Workspace           @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user              User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId, role])
  @@index([userId])
}

model Contributor {
  id                String              @id @default(uuid())
  workspaceId       String
  linkedUserId      String?
  name              String
  email             String?
  walletAddress     String
  role              String?
  notes             String?
  status            ContributorStatus   @default(active)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  workspace         Workspace           @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  linkedUser        User?               @relation("LinkedContributor", fields: [linkedUserId], references: [id], onDelete: SetNull)
  payouts           Payout[]

  @@index([workspaceId, status])
  @@index([workspaceId, name])
}

model Payout {
  id                String              @id @default(uuid())
  workspaceId       String
  contributorId     String
  createdByUserId   String
  title             String
  description       String?
  currency          String              @default("USDC")
  totalAmountUsdc   Decimal             @db.Decimal(30, 6)
  status            PayoutStatus        @default(draft)
  chainId           String?
  usdcTokenAddress  String?
  targetWalletAddress String?
  startDate         DateTime?
  dueDate           DateTime?
  completedAt       DateTime?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  workspace         Workspace           @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  contributor       Contributor         @relation(fields: [contributorId], references: [id], onDelete: Restrict)
  createdBy         User                @relation("PayoutCreator", fields: [createdByUserId], references: [id], onDelete: Restrict)
  milestones        Milestone[]
  releases          Release[]
  transactionProofs TransactionProof[]
  activityLogs      ActivityLog[]

  @@index([workspaceId, status])
  @@index([contributorId])
  @@index([createdAt])
}

model Milestone {
  id                String              @id @default(uuid())
  payoutId          String
  title             String
  description       String
  acceptanceCriteria String?
  amountUsdc        Decimal             @db.Decimal(30, 6)
  sequence          Int
  status            MilestoneStatus     @default(pending)
  dueDate           DateTime?
  submittedAt       DateTime?
  approvedAt        DateTime?
  rejectedAt        DateTime?
  releasedAt        DateTime?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  payout            Payout              @relation(fields: [payoutId], references: [id], onDelete: Cascade)
  submissions       MilestoneSubmission[]
  reviews           MilestoneReview[]
  releases          Release[]
  transactionProofs TransactionProof[]
  activityLogs      ActivityLog[]

  @@unique([payoutId, sequence])
  @@index([payoutId, status])
}

model MilestoneSubmission {
  id                String              @id @default(uuid())
  milestoneId       String
  submittedByUserId String
  summary           String
  artifactUrl       String?
  artifactLabel     String?
  notes             String?
  resubmissionNumber Int                 @default(0)
  submittedAt       DateTime            @default(now())

  milestone         Milestone           @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  submittedBy       User                @relation(fields: [submittedByUserId], references: [id], onDelete: Restrict)
  reviews           MilestoneReview[]

  @@index([milestoneId, submittedAt])
  @@index([submittedByUserId])
}

model MilestoneReview {
  id                String              @id @default(uuid())
  milestoneId       String
  submissionId      String
  reviewedByUserId  String
  decision          ReviewDecision
  comment           String?
  reviewedAt        DateTime            @default(now())

  milestone         Milestone           @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  submission        MilestoneSubmission @relation(fields: [submissionId], references: [id], onDelete: Restrict)
  reviewedBy        User                @relation(fields: [reviewedByUserId], references: [id], onDelete: Restrict)

  @@index([milestoneId, reviewedAt])
  @@index([submissionId])
}

model Release {
  id                String              @id @default(uuid())
  payoutId          String
  milestoneId       String?
  triggeredByUserId String
  amountUsdc        Decimal             @db.Decimal(30, 6)
  executionMode     ReleaseExecutionMode
  sourceWalletAddress String?
  destinationWalletAddress String
  status            ReleaseStatus       @default(queued)
  arcRequestId      String?
  txHash            String?             @unique
  explorerUrl       String?
  failureReason     String?
  requestedAt       DateTime            @default(now())
  executedAt        DateTime?
  failedAt          DateTime?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  payout            Payout              @relation(fields: [payoutId], references: [id], onDelete: Restrict)
  milestone         Milestone?         @relation(fields: [milestoneId], references: [id], onDelete: Restrict)
  triggeredBy       User                @relation(fields: [triggeredByUserId], references: [id], onDelete: Restrict)
  proofs            TransactionProof[]

  @@index([payoutId, status])
  @@index([milestoneId])
  @@index([arcRequestId])
  @@index([executionMode, status])
}

model TransactionProof {
  id                String                @id @default(uuid())
  payoutId          String
  milestoneId       String?
  releaseId         String?
  status            TransactionProofStatus @default(pending)
  txHash            String?
  network           String?
  explorerUrl       String?
  blockNumber       BigInt?
  failureReason     String?
  confirmedAt       DateTime?
  failedAt          DateTime?
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  payout            Payout                @relation(fields: [payoutId], references: [id], onDelete: Restrict)
  milestone         Milestone?           @relation(fields: [milestoneId], references: [id], onDelete: Restrict)
  release           Release?              @relation(fields: [releaseId], references: [id], onDelete: Restrict)

  @@unique([txHash])
  @@index([payoutId, status])
  @@index([releaseId])
}

model ActivityLog {
  id                String              @id @default(uuid())
  workspaceId       String
  actorUserId       String
  payoutId          String?
  milestoneId       String?
  releaseId         String?
  entityType        String
  entityId          String
  action            String
  metadataJson      Json?
  occurredAt        DateTime            @default(now())

  workspace         Workspace           @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  actorUser         User                @relation(fields: [actorUserId], references: [id], onDelete: Restrict)
  payout            Payout?             @relation(fields: [payoutId], references: [id], onDelete: Cascade)
  milestone         Milestone?          @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  release           Release?            @relation(fields: [releaseId], references: [id], onDelete: Cascade)

  @@index([workspaceId, occurredAt])
  @@index([payoutId, occurredAt])
  @@index([entityType, entityId])
}
```

## Important Schema Caveats

### Cross-table amount invariant
PostgreSQL/Prisma cannot express "sum of all milestone amounts equals payout total" as a normal simple check constraint.

Enforce it in the transaction that creates or updates payout milestones:
1. calculate decimal sum
2. compare against payout total
3. reject write if unequal
4. activate payout only after validation succeeds

### Release uniqueness
The illustrative schema allows multiple releases per milestone to preserve retry history. Application logic must prevent a second active release for the same milestone while an existing one is `queued` or `pending`.

### Release execution mode
`executionMode` is persisted on each release so the selected signing path is auditable and cannot silently change between retries:

- `browser_wallet`: the operator's connected wallet submits the transaction.
- `circle_wallet`: a protected server-side Circle Wallets adapter submits the transaction.

The database stores wallet addresses and transaction metadata, but never private keys, API secrets, entity secrets, or other signing credentials. Circle Wallets credentials belong only in server-side environment configuration.

### Proof uniqueness
`txHash` is nullable because queued/failed proofs may not have a transaction hash. PostgreSQL permits multiple NULL values under a normal unique constraint. Once present, a transaction hash must be unique.

### Activity log foreign keys
The nullable entity references are convenient for querying, but the application should always populate the most relevant parent references. `entityType` and `entityId` remain the generic audit target.

### Delete policy
Do not hard-delete financial records in normal product flows. The `onDelete` settings protect payouts and settlement history while allowing workspace-owned draft/demo records to be cleaned up only through explicit administrative policy.

## Required Database Indexes
Minimum indexes:
- workspace + payout status
- payout + milestone status
- payout + milestone sequence uniqueness
- milestone + submission timestamp
- milestone + review timestamp
- payout/release status
- payout/proof status
- workspace/activity timestamp
- transaction hash uniqueness

## Transaction Boundaries
The following operations should be database transactions:

### Create payout
- create payout
- create milestones
- validate amount sum
- append `payout.created`

### Activate payout
- lock payout
- validate required fields and amount sum
- change payout status
- append activation event

### Approve/reject milestone
- lock milestone
- verify current status and latest submission
- create review
- update milestone status/timestamp
- append activity event

### Trigger release
- lock milestone/payout
- verify milestone is approved
- create release
- create pending proof
- append activity event

### Confirm release
- update release
- update proof
- update milestone to released if business rule is met
- derive payout status
- append confirmation event

## Migration Plan

### Migration 1: persistence foundation
Create:
- Workspace
- User
- WorkspaceMember
- Contributor
- Payout
- Milestone

Seed one workspace and current mock contributors/payouts/milestones.

### Migration 2: review workflow
Create:
- MilestoneSubmission
- MilestoneReview
- ActivityLog

Add submission/review APIs and replace corresponding mock state.

### Migration 3: settlement workflow
Create:
- Release
- TransactionProof

Add release/proof persistence while Arc send remains behind integration interface.

## Seed Strategy
Seed data should be explicitly marked demo data, for example:
- workspace slug: `demo`
- stable demo IDs only in seed scripts
- no seed wallet treated as production wallet
- no live settlement from seeded records

The current mock arrays should be transformed into seed input, not imported directly by runtime database code.

## Data Access Boundary
Recommended future structure:

```text
lib/
  db/
    client.ts
    enums.ts
  repositories/
    payouts.ts
    milestones.ts
    contributors.ts
    releases.ts
  services/
    payout-service.ts
    milestone-service.ts
    release-service.ts
```

Rules:
- route handlers should not contain raw Prisma queries
- repositories handle reads and persistence primitives
- services enforce state transitions and transaction boundaries
- Arc adapter remains behind `lib/arc/`

## Compatibility With Current Models
Current model fields map as follows:

| Current UI model | Persistence field |
|---|---|
| `Contributor.name` | `Contributor.name` |
| `Contributor.walletAddress` | `Contributor.walletAddress` |
| `Payout.totalAmount` | `Payout.totalAmountUsdc` |
| `Payout.currency` | `Payout.currency` |
| `Milestone.amount` | `Milestone.amountUsdc` |
| `TransactionProof.milestoneId` | `TransactionProof.milestoneId` |
| `TransactionProof.txHash` | `TransactionProof.txHash` |
| `TransactionProof.network` | `TransactionProof.network` |
| `TransactionProof.explorerUrl` | `TransactionProof.explorerUrl` |

The API/read-model layer can continue exposing `totalAmount` and `amount` aliases temporarily while UI types are migrated to explicit `*Usdc` names.

## Recommended Stack Decision
Use:
- PostgreSQL
- Prisma
- Prisma Migrate
- a small repository/service layer
- Route Handlers for the first API surface

Do not add:
- separate microservice
- event bus
- CQRS framework
- generic repository abstraction
- production wallet executor

Those additions would increase complexity before the core state machine is validated.

## Decisions Needed Before Implementation
1. Confirm PostgreSQL as target database.
2. Confirm Prisma as ORM.
3. Choose authentication provider or temporary local actor strategy.
4. Decide whether `Payout` requires a workspace in first migration.
5. Decide whether release confirmation is required for `completed`.
6. Decide whether contributors are authenticated users in V1.
7. Confirm whether `TransactionProof.releaseId` is the primary proof link.

## Next Implementation Step After Approval
After this document is accepted:
1. add Prisma dependency and configuration
2. create `prisma/schema.prisma`
3. generate initial migration
4. add DB client boundary
5. write seed script from current mock data
6. implement read-only payout/contributor queries before mutations

No step above has been executed by this document.
