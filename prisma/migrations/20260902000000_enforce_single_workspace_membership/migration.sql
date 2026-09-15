-- A person has one role in each workspace. Do not infer a winner for historical
-- multi-role records: an operator must resolve them before this migration runs.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "WorkspaceMember"
    GROUP BY "workspaceId", "userId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one WorkspaceMember role per user/workspace: conflicting membership rows exist. Resolve duplicate (workspaceId, userId) pairs before rerunning this migration.';
  END IF;
END $$;

DROP INDEX "WorkspaceMember_workspaceId_userId_role_key";

CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key"
  ON "WorkspaceMember"("workspaceId", "userId");
