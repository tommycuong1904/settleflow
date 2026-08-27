-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "notifyOnApprove" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnRelease" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnSubmit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "webhookUrl" TEXT;
