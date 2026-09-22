-- Wallet links are account-owned, not workspace-owned. Existing identity
-- values are backfilled only when they are valid and unambiguous; this
-- migration never merges users or selects a winner for an address collision.
CREATE TYPE "UserWalletKind" AS ENUM ('web3_eoa', 'circle_sca', 'legacy_export_eoa');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    WHERE "walletAddress" IS NOT NULL
      AND LOWER("walletAddress") !~ '^0x[0-9a-f]{40}$'
  ) THEN
    RAISE EXCEPTION
      'Cannot backfill UserWallet: User.walletAddress contains a non-EVM address. Resolve invalid values before rerunning this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CircleUserWallet"
    WHERE LOWER("address") !~ '^0x[0-9a-f]{40}$'
  ) THEN
    RAISE EXCEPTION
      'Cannot backfill UserWallet: CircleUserWallet.address contains a non-EVM address. Resolve invalid values before rerunning this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT LOWER("walletAddress") AS address
      FROM "User"
      WHERE "walletAddress" IS NOT NULL
      UNION ALL
      SELECT LOWER("address") AS address
      FROM "CircleUserWallet"
    ) AS wallet_addresses
    GROUP BY address
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot backfill UserWallet: an EVM address appears more than once across legacy User and Circle wallet records. Resolve the conflicting account links before rerunning this migration.';
  END IF;
END $$;

CREATE TABLE "UserWallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "normalizedAddress" TEXT NOT NULL,
  "kind" "UserWalletKind" NOT NULL,
  "authEnabled" BOOLEAN NOT NULL DEFAULT false,
  "transactionEnabled" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserWallet_normalizedAddress_matches_address"
    CHECK ("normalizedAddress" = LOWER("address"))
);

CREATE UNIQUE INDEX "UserWallet_normalizedAddress_key" ON "UserWallet"("normalizedAddress");
CREATE INDEX "UserWallet_userId_idx" ON "UserWallet"("userId");

ALTER TABLE "UserWallet"
  ADD CONSTRAINT "UserWallet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserWallet" (
  "id", "userId", "address", "normalizedAddress", "kind",
  "authEnabled", "transactionEnabled", "verifiedAt", "createdAt", "updatedAt"
)
SELECT
  MD5('legacy_export_eoa:' || "id"),
  "id",
  "walletAddress",
  LOWER("walletAddress"),
  'legacy_export_eoa'::"UserWalletKind",
  true,
  true,
  "createdAt",
  "createdAt",
  "updatedAt"
FROM "User"
WHERE "walletAddress" IS NOT NULL;

INSERT INTO "UserWallet" (
  "id", "userId", "address", "normalizedAddress", "kind",
  "authEnabled", "transactionEnabled", "verifiedAt", "createdAt", "updatedAt"
)
SELECT
  MD5('circle_sca:' || "id"),
  "userId",
  "address",
  LOWER("address"),
  'circle_sca'::"UserWalletKind",
  false,
  true,
  "createdAt",
  "createdAt",
  "updatedAt"
FROM "CircleUserWallet";

ALTER TABLE "CircleUserWallet" ADD COLUMN "walletLinkId" TEXT;
CREATE UNIQUE INDEX "CircleUserWallet_walletLinkId_key" ON "CircleUserWallet"("walletLinkId");

UPDATE "CircleUserWallet" AS circle_wallet
SET "walletLinkId" = wallet_link."id"
FROM "UserWallet" AS wallet_link
WHERE wallet_link."userId" = circle_wallet."userId"
  AND wallet_link."kind" = 'circle_sca'
  AND wallet_link."normalizedAddress" = LOWER(circle_wallet."address");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CircleUserWallet" WHERE "walletLinkId" IS NULL) THEN
    RAISE EXCEPTION
      'Cannot backfill CircleUserWallet link: a Circle wallet did not map to exactly one UserWallet.';
  END IF;
END $$;

ALTER TABLE "CircleUserWallet" ALTER COLUMN "walletLinkId" SET NOT NULL;

ALTER TABLE "CircleUserWallet"
  ADD CONSTRAINT "CircleUserWallet_walletLinkId_fkey"
  FOREIGN KEY ("walletLinkId") REFERENCES "UserWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Release" ADD COLUMN "sourceWalletId" TEXT;
CREATE INDEX "Release_sourceWalletId_idx" ON "Release"("sourceWalletId");
ALTER TABLE "Release"
  ADD CONSTRAINT "Release_sourceWalletId_fkey"
  FOREIGN KEY ("sourceWalletId") REFERENCES "UserWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
