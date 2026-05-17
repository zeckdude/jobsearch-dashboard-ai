CREATE TABLE "OutcomeCalibrationSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "summaryJson" JSONB NOT NULL DEFAULT '{}',
    "workflowsJson" JSONB NOT NULL DEFAULT '[]',
    "signalsJson" JSONB NOT NULL DEFAULT '[]',
    "actionsJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutcomeCalibrationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutcomeCalibrationSnapshot_userId_createdAt_idx" ON "OutcomeCalibrationSnapshot"("userId", "createdAt");

ALTER TABLE "OutcomeCalibrationSnapshot" ADD CONSTRAINT "OutcomeCalibrationSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
