-- CreateEnum
CREATE TYPE "JobSearchRunItemStage" AS ENUM ('fetched', 'new', 'matched', 'saved');

-- CreateTable
CREATE TABLE "JobSearchRunItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stage" "JobSearchRunItemStage" NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "applicationUrl" TEXT,
    "sourceName" TEXT,
    "profileId" TEXT,
    "profileName" TEXT,
    "overallScore" INT,
    "matchTier" TEXT,
    "jobPostingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSearchRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobSearchRunItem_runId_stage_idx" ON "JobSearchRunItem"("runId", "stage");

-- CreateIndex
CREATE INDEX "JobSearchRunItem_runId_stage_createdAt_idx" ON "JobSearchRunItem"("runId", "stage", "createdAt");

-- CreateIndex
CREATE INDEX "JobSearchRunItem_jobPostingId_idx" ON "JobSearchRunItem"("jobPostingId");

-- AddForeignKey
ALTER TABLE "JobSearchRunItem" ADD CONSTRAINT "JobSearchRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "JobSearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSearchRunItem" ADD CONSTRAINT "JobSearchRunItem_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
