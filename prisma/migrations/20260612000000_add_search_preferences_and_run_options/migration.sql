-- AlterTable
ALTER TABLE "JobSearchRun" ADD COLUMN "runOptions" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "JobSearchPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxPostedAgeDays" INTEGER DEFAULT 14,
    "postedAfter" TIMESTAMP(3),
    "postedBefore" TIMESTAMP(3),
    "includeUnknownPostedDates" BOOLEAN NOT NULL DEFAULT true,
    "defaultSourceIds" JSONB NOT NULL DEFAULT '[]',
    "defaultProfileIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSearchPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobSearchPreferences_userId_key" ON "JobSearchPreferences"("userId");

-- AddForeignKey
ALTER TABLE "JobSearchPreferences" ADD CONSTRAINT "JobSearchPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
