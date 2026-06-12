-- AlterTable
ALTER TABLE "JobSearchRunItem" ADD COLUMN "listedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "JobSearchRunItem_runId_stage_listedAt_idx" ON "JobSearchRunItem"("runId", "stage", "listedAt");
