-- AlterTable
ALTER TABLE "Contributor" ADD COLUMN     "createdByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Contributor" ADD CONSTRAINT "Contributor_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
