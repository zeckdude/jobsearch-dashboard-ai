-- CreateTable
CREATE TABLE "ApplicationFormPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "atsProvider" "AtsProvider" NOT NULL DEFAULT 'unknown',
    "host" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "inputType" TEXT,
    "selector" TEXT,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationFormPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationFormPattern_userId_host_fieldKey_category_key" ON "ApplicationFormPattern"("userId", "host", "fieldKey", "category");

-- CreateIndex
CREATE INDEX "ApplicationFormPattern_userId_atsProvider_lastSeenAt_idx" ON "ApplicationFormPattern"("userId", "atsProvider", "lastSeenAt");

-- CreateIndex
CREATE INDEX "ApplicationFormPattern_userId_category_idx" ON "ApplicationFormPattern"("userId", "category");

-- AddForeignKey
ALTER TABLE "ApplicationFormPattern" ADD CONSTRAINT "ApplicationFormPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
