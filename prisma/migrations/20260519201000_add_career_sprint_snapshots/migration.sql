CREATE TABLE "CareerSprintSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionJson" JSONB NOT NULL DEFAULT '{}',
    "briefJson" JSONB NOT NULL DEFAULT '{}',
    "moneyMovesJson" JSONB NOT NULL DEFAULT '[]',
    "sprintScore" INTEGER NOT NULL DEFAULT 0,
    "incomeMomentum" TEXT NOT NULL DEFAULT 'insufficient_data',
    "attentionDebt" INTEGER NOT NULL DEFAULT 0,
    "completedMoveKeys" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerSprintSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareerSprintSnapshot_userId_createdAt_idx" ON "CareerSprintSnapshot"("userId", "createdAt");

CREATE INDEX "CareerSprintSnapshot_userId_incomeMomentum_createdAt_idx" ON "CareerSprintSnapshot"("userId", "incomeMomentum", "createdAt");

ALTER TABLE "CareerSprintSnapshot" ADD CONSTRAINT "CareerSprintSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
