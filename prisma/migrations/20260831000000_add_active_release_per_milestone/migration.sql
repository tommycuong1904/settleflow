-- A milestone may retain failed/confirmed release history, but cannot have two
-- executable release intents concurrently.
CREATE UNIQUE INDEX "Release_one_active_per_milestone"
ON "Release" ("milestoneId")
WHERE "milestoneId" IS NOT NULL AND "status" IN ('queued', 'pending');
