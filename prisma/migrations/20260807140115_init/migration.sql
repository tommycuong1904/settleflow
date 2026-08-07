-- CreateEnum
CREATE TYPE "WorkspaceMemberRole" AS ENUM ('owner', 'ops', 'reviewer', 'contributor');

-- CreateEnum
CREATE TYPE "ContributorStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('draft', 'active', 'partially_released', 'completed');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('pending', 'submitted', 'approved', 'released', 'rejected');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('approved', 'rejected');

-- CreateEnum
CREATE TYPE "ReleaseExecutionMode" AS ENUM ('browser_wallet', 'circle_wallet');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('queued', 'pending', 'confirmed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "TransactionProofStatus" AS ENUM ('pending', 'confirmed', 'failed');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USDC',
    "defaultChainId" TEXT,
    "defaultUsdcAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "walletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceMemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contributor" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "walletAddress" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "status" "ContributorStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "totalAmountUsdc" DECIMAL(30,6) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'draft',
    "chainId" TEXT,
    "usdcTokenAddress" TEXT,
    "targetWalletAddress" TEXT,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "acceptanceCriteria" TEXT,
    "amountUsdc" DECIMAL(30,6) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneSubmission" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "artifactUrl" TEXT,
    "artifactLabel" TEXT,
    "notes" TEXT,
    "resubmissionNumber" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneReview" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewedByUserId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comment" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "triggeredByUserId" TEXT NOT NULL,
    "amountUsdc" DECIMAL(30,6) NOT NULL,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'queued',
    "arcRequestId" TEXT,
    "executionMode" "ReleaseExecutionMode" NOT NULL,
    "sourceWalletAddress" TEXT,
    "destinationWalletAddress" TEXT NOT NULL,
    "txHash" TEXT,
    "explorerUrl" TEXT,
    "failureReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionProof" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "releaseId" TEXT,
    "status" "TransactionProofStatus" NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "network" TEXT,
    "explorerUrl" TEXT,
    "blockNumber" BIGINT,
    "failureReason" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "payoutId" TEXT,
    "milestoneId" TEXT,
    "releaseId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadataJson" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_role_key" ON "WorkspaceMember"("workspaceId", "userId", "role");

-- CreateIndex
CREATE INDEX "Contributor_workspaceId_status_idx" ON "Contributor"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Contributor_workspaceId_name_idx" ON "Contributor"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Payout_workspaceId_status_idx" ON "Payout"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Payout_contributorId_idx" ON "Payout"("contributorId");

-- CreateIndex
CREATE INDEX "Payout_createdAt_idx" ON "Payout"("createdAt");

-- CreateIndex
CREATE INDEX "Milestone_payoutId_status_idx" ON "Milestone"("payoutId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_payoutId_sequence_key" ON "Milestone"("payoutId", "sequence");

-- CreateIndex
CREATE INDEX "MilestoneSubmission_milestoneId_submittedAt_idx" ON "MilestoneSubmission"("milestoneId", "submittedAt");

-- CreateIndex
CREATE INDEX "MilestoneSubmission_submittedByUserId_idx" ON "MilestoneSubmission"("submittedByUserId");

-- CreateIndex
CREATE INDEX "MilestoneReview_milestoneId_reviewedAt_idx" ON "MilestoneReview"("milestoneId", "reviewedAt");

-- CreateIndex
CREATE INDEX "MilestoneReview_submissionId_idx" ON "MilestoneReview"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Release_txHash_key" ON "Release"("txHash");

-- CreateIndex
CREATE INDEX "Release_payoutId_status_idx" ON "Release"("payoutId", "status");

-- CreateIndex
CREATE INDEX "Release_milestoneId_idx" ON "Release"("milestoneId");

-- CreateIndex
CREATE INDEX "Release_arcRequestId_idx" ON "Release"("arcRequestId");

-- CreateIndex
CREATE INDEX "Release_executionMode_status_idx" ON "Release"("executionMode", "status");

-- CreateIndex
CREATE INDEX "TransactionProof_payoutId_status_idx" ON "TransactionProof"("payoutId", "status");

-- CreateIndex
CREATE INDEX "TransactionProof_releaseId_idx" ON "TransactionProof"("releaseId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionProof_txHash_key" ON "TransactionProof"("txHash");

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_occurredAt_idx" ON "ActivityLog"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityLog_payoutId_occurredAt_idx" ON "ActivityLog"("payoutId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contributor" ADD CONSTRAINT "Contributor_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contributor" ADD CONSTRAINT "Contributor_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Contributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneSubmission" ADD CONSTRAINT "MilestoneSubmission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneSubmission" ADD CONSTRAINT "MilestoneSubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneReview" ADD CONSTRAINT "MilestoneReview_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneReview" ADD CONSTRAINT "MilestoneReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "MilestoneSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneReview" ADD CONSTRAINT "MilestoneReview_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionProof" ADD CONSTRAINT "TransactionProof_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionProof" ADD CONSTRAINT "TransactionProof_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionProof" ADD CONSTRAINT "TransactionProof_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;
