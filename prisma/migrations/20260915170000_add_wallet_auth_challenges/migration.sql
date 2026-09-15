-- Wallet challenges must survive separate serverless route invocations. Their
-- nonce is the primary key so consumption can be an atomic conditional delete.
CREATE TABLE "WalletAuthChallenge" (
    "nonce" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletAuthChallenge_pkey" PRIMARY KEY ("nonce")
);

CREATE INDEX "WalletAuthChallenge_expiresAt_idx"
  ON "WalletAuthChallenge"("expiresAt");
