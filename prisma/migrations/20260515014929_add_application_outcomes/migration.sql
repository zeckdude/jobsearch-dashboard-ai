-- CreateEnum
CREATE TYPE "ApplicationOutcomeType" AS ENUM ('APPLIED', 'REJECTED', 'GHOSTED', 'RECRUITER_SCREEN', 'TECH_SCREEN', 'ONSITE', 'FINAL', 'OFFER', 'CLOSED');

-- CreateTable
CREATE TABLE "ApplicationOutcome" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "outcome" "ApplicationOutcomeType" NOT NULL,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationOutcome_userId_occurredAt_idx" ON "ApplicationOutcome"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "ApplicationOutcome_applicationId_occurredAt_idx" ON "ApplicationOutcome"("applicationId", "occurredAt");

-- CreateIndex
CREATE INDEX "ApplicationOutcome_jobPostingId_outcome_idx" ON "ApplicationOutcome"("jobPostingId", "outcome");

-- AddForeignKey
ALTER TABLE "ApplicationOutcome" ADD CONSTRAINT "ApplicationOutcome_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationOutcome" ADD CONSTRAINT "ApplicationOutcome_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationOutcome" ADD CONSTRAINT "ApplicationOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
