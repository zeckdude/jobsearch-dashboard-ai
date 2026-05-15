-- CreateEnum
CREATE TYPE "RecruiterOutreachStatus" AS ENUM ('DRAFT', 'SENT', 'REPLIED', 'NO_RESPONSE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "RecruiterOutreach" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    "jobPostingId" TEXT,
    "message" TEXT NOT NULL,
    "status" "RecruiterOutreachStatus" NOT NULL DEFAULT 'DRAFT',
    "followUpAt" TIMESTAMP(3),
    "evidenceRefs" JSONB NOT NULL DEFAULT '[]',
    "qualityReview" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecruiterOutreach_userId_status_idx" ON "RecruiterOutreach"("userId", "status");

-- CreateIndex
CREATE INDEX "RecruiterOutreach_jobPostingId_createdAt_idx" ON "RecruiterOutreach"("jobPostingId", "createdAt");

-- CreateIndex
CREATE INDEX "RecruiterOutreach_contactId_createdAt_idx" ON "RecruiterOutreach"("contactId", "createdAt");

-- AddForeignKey
ALTER TABLE "RecruiterOutreach" ADD CONSTRAINT "RecruiterOutreach_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterOutreach" ADD CONSTRAINT "RecruiterOutreach_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterOutreach" ADD CONSTRAINT "RecruiterOutreach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
