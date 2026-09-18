-- Circle user-controlled wallets are distinct from the existing optional
-- User.walletAddress identity used by browser-wallet authentication.
CREATE TYPE "ReleaseExecutionMode_new" AS ENUM ('browser_wallet', 'circle_wallet', 'circle_user_wallet');

ALTER TABLE "Release"
  ALTER COLUMN "executionMode" TYPE "ReleaseExecutionMode_new"
  USING ("executionMode"::text::"ReleaseExecutionMode_new");

ALTER TYPE "ReleaseExecutionMode" RENAME TO "ReleaseExecutionMode_old";
ALTER TYPE "ReleaseExecutionMode_new" RENAME TO "ReleaseExecutionMode";
DROP TYPE "ReleaseExecutionMode_old";

CREATE TABLE "CircleUserWallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "blockchain" TEXT NOT NULL,
  "accountType" TEXT NOT NULL,
  "scaCore" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CircleUserWallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleUserWallet_userId_key" ON "CircleUserWallet"("userId");
CREATE UNIQUE INDEX "CircleUserWallet_walletId_key" ON "CircleUserWallet"("walletId");
CREATE INDEX "CircleUserWallet_blockchain_idx" ON "CircleUserWallet"("blockchain");

ALTER TABLE "CircleUserWallet"
  ADD CONSTRAINT "CircleUserWallet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CircleWalletProvisioning" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "challengeId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CircleWalletProvisioning_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleWalletProvisioning_userId_key" ON "CircleWalletProvisioning"("userId");
CREATE UNIQUE INDEX "CircleWalletProvisioning_idempotencyKey_key" ON "CircleWalletProvisioning"("idempotencyKey");
CREATE UNIQUE INDEX "CircleWalletProvisioning_challengeId_key" ON "CircleWalletProvisioning"("challengeId");

ALTER TABLE "CircleWalletProvisioning"
  ADD CONSTRAINT "CircleWalletProvisioning_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
