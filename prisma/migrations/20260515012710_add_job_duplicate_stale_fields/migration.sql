-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "duplicateGroupId" TEXT,
ADD COLUMN     "staleScore" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "JobPosting_duplicateGroupId_idx" ON "JobPosting"("duplicateGroupId");

-- CreateIndex
CREATE INDEX "JobPosting_staleScore_lastSeenAt_idx" ON "JobPosting"("staleScore", "lastSeenAt");
