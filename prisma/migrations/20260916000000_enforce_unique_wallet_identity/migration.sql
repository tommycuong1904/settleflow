-- A verified wallet address identifies exactly one User across all workspaces.
-- Do not choose a winner for historical collisions; an operator must resolve
-- them before wallet self-provisioning can be enabled safely.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    WHERE "walletAddress" IS NOT NULL
    GROUP BY LOWER("walletAddress")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce unique wallet identity: duplicate User.walletAddress values exist when compared case-insensitively. Resolve duplicate wallet identities before rerunning this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX "User_walletAddress_lower_key"
  ON "User" (LOWER("walletAddress"))
  WHERE "walletAddress" IS NOT NULL;
