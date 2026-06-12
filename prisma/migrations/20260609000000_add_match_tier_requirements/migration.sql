-- CreateEnum
CREATE TYPE "MatchTier" AS ENUM ('full', 'partial');

-- AlterTable
ALTER TABLE "JobProfileMatch" ADD COLUMN "discoveredByProfileId" TEXT,
ADD COLUMN "matchTier" "MatchTier" NOT NULL DEFAULT 'full',
ADD COLUMN "failedRequirements" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "passedRequirements" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "discoveryMetadata" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "JobProfileMatch_matchTier_status_idx" ON "JobProfileMatch"("matchTier", "status");

-- AddForeignKey
ALTER TABLE "JobProfileMatch" ADD CONSTRAINT "JobProfileMatch_discoveredByProfileId_fkey" FOREIGN KEY ("discoveredByProfileId") REFERENCES "JobSearchProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
