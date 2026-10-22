CREATE TYPE "PaymentMethod" AS ENUM ('simulated', 'crypto_wallet');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE "PaymentEvidenceType" AS ENUM ('none', 'transaction');

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "payoutId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "markedByUserId" TEXT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  "evidenceType" "PaymentEvidenceType" NOT NULL DEFAULT 'none',
  "amountUsdc" DECIMAL(30,6) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USDC',
  "recipientLabel" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_milestoneId_key" ON "PaymentAttempt"("milestoneId");
CREATE INDEX "PaymentAttempt_payoutId_status_idx" ON "PaymentAttempt"("payoutId", "status");
CREATE INDEX "PaymentAttempt_markedByUserId_idx" ON "PaymentAttempt"("markedByUserId");

ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_markedByUserId_fkey" FOREIGN KEY ("markedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
