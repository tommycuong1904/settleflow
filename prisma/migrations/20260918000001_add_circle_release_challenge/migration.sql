-- A Circle user-controlled transfer challenge is persisted independently from
-- the provider transaction ID so a reload cannot create a second release.
ALTER TABLE "Release" ADD COLUMN IF NOT EXISTS "circleChallengeId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Release_circleChallengeId_key" ON "Release"("circleChallengeId");
