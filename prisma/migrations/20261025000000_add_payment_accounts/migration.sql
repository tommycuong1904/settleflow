-- Provider-neutral payment-account identity. No key material, token, or
-- provider credential is stored here. A linked UserWallet remains the
-- canonical verified EVM address.
CREATE TYPE "PaymentAccountStatus" AS ENUM ('provisioning', 'ready', 'suspended');

CREATE TABLE "PaymentAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT,
  "walletLinkId" TEXT,
  "status" "PaymentAccountStatus" NOT NULL DEFAULT 'provisioning',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAccount_walletLinkId_key" ON "PaymentAccount"("walletLinkId");
CREATE UNIQUE INDEX "PaymentAccount_userId_provider_key" ON "PaymentAccount"("userId", "provider");
CREATE UNIQUE INDEX "PaymentAccount_provider_providerAccountId_key" ON "PaymentAccount"("provider", "providerAccountId");
CREATE INDEX "PaymentAccount_status_idx" ON "PaymentAccount"("status");

ALTER TABLE "PaymentAccount"
  ADD CONSTRAINT "PaymentAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentAccount"
  ADD CONSTRAINT "PaymentAccount_walletLinkId_fkey"
  FOREIGN KEY ("walletLinkId") REFERENCES "UserWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
