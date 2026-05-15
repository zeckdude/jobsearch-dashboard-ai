-- CreateEnum
CREATE TYPE "InterviewPrepTaskStatus" AS ENUM ('OPEN', 'DONE', 'DISMISSED');

-- CreateTable
CREATE TABLE "InterviewPrepTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "evidenceRef" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "status" "InterviewPrepTaskStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewPrepTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewPrepTask_applicationId_title_key" ON "InterviewPrepTask"("applicationId", "title");

-- CreateIndex
CREATE INDEX "InterviewPrepTask_userId_status_priority_idx" ON "InterviewPrepTask"("userId", "status", "priority");

-- CreateIndex
CREATE INDEX "InterviewPrepTask_applicationId_status_idx" ON "InterviewPrepTask"("applicationId", "status");

-- AddForeignKey
ALTER TABLE "InterviewPrepTask" ADD CONSTRAINT "InterviewPrepTask_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPrepTask" ADD CONSTRAINT "InterviewPrepTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
