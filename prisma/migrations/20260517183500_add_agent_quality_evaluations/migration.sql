CREATE TYPE "AgentQualityTarget" AS ENUM ('APPLICATION_ASSISTANT', 'JOB_MATCHING', 'GENERATED_MATERIALS');

CREATE TYPE "AgentQualityExampleSource" AS ENUM ('SKILL_FEEDBACK', 'AUTOMATION_RUN', 'MANUAL_REPAIR', 'BACKFILL');

CREATE TYPE "AgentQualityEvaluationStatus" AS ENUM ('PASSED', 'FAILED', 'NEEDS_REVIEW');

CREATE TYPE "AgentImprovementProposalStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DISMISSED');

CREATE TYPE "AgentImprovementProposalType" AS ENUM ('PROMPT', 'SKILL', 'CLASSIFIER', 'WORKFLOW');

CREATE TABLE "AgentQualityDataset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" "AgentQualityTarget" NOT NULL DEFAULT 'APPLICATION_ASSISTANT',
    "description" TEXT,
    "langSmithDatasetId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentQualityDataset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentQualityExample" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "datasetId" TEXT,
    "target" "AgentQualityTarget" NOT NULL DEFAULT 'APPLICATION_ASSISTANT',
    "source" "AgentQualityExampleSource" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "failureCategory" TEXT,
    "inputJson" JSONB NOT NULL DEFAULT '{}',
    "expectedJson" JSONB NOT NULL DEFAULT '{}',
    "actualJson" JSONB NOT NULL DEFAULT '{}',
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "langSmithExampleId" TEXT,
    "skillFeedbackId" TEXT,
    "agentRunId" TEXT,
    "automationRunId" TEXT,
    "applicationId" TEXT,
    "jobPostingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentQualityExample_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentQualityEvaluation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "datasetId" TEXT,
    "exampleId" TEXT,
    "agentRunId" TEXT,
    "target" "AgentQualityTarget" NOT NULL DEFAULT 'APPLICATION_ASSISTANT',
    "evaluatorVersion" TEXT NOT NULL,
    "status" "AgentQualityEvaluationStatus" NOT NULL,
    "score" INTEGER NOT NULL,
    "failureCategory" TEXT,
    "summary" TEXT NOT NULL,
    "metricsJson" JSONB NOT NULL DEFAULT '{}',
    "langSmithRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentQualityEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentImprovementProposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "target" "AgentQualityTarget" NOT NULL DEFAULT 'APPLICATION_ASSISTANT',
    "type" "AgentImprovementProposalType" NOT NULL,
    "status" "AgentImprovementProposalStatus" NOT NULL DEFAULT 'PROPOSED',
    "riskLevel" "SkillAdjustmentRiskLevel" NOT NULL DEFAULT 'LOW',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "affectedExampleIds" JSONB NOT NULL DEFAULT '[]',
    "patchJson" JSONB NOT NULL DEFAULT '{}',
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "skillFeedbackId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentImprovementProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentQualityDataset_userId_name_key" ON "AgentQualityDataset"("userId", "name");
CREATE INDEX "AgentQualityDataset_userId_target_active_idx" ON "AgentQualityDataset"("userId", "target", "active");

CREATE INDEX "AgentQualityExample_userId_target_createdAt_idx" ON "AgentQualityExample"("userId", "target", "createdAt");
CREATE INDEX "AgentQualityExample_datasetId_createdAt_idx" ON "AgentQualityExample"("datasetId", "createdAt");
CREATE INDEX "AgentQualityExample_skillFeedbackId_idx" ON "AgentQualityExample"("skillFeedbackId");
CREATE INDEX "AgentQualityExample_agentRunId_idx" ON "AgentQualityExample"("agentRunId");
CREATE INDEX "AgentQualityExample_automationRunId_idx" ON "AgentQualityExample"("automationRunId");
CREATE INDEX "AgentQualityExample_applicationId_idx" ON "AgentQualityExample"("applicationId");
CREATE INDEX "AgentQualityExample_jobPostingId_idx" ON "AgentQualityExample"("jobPostingId");

CREATE INDEX "AgentQualityEvaluation_userId_target_createdAt_idx" ON "AgentQualityEvaluation"("userId", "target", "createdAt");
CREATE INDEX "AgentQualityEvaluation_datasetId_createdAt_idx" ON "AgentQualityEvaluation"("datasetId", "createdAt");
CREATE INDEX "AgentQualityEvaluation_exampleId_idx" ON "AgentQualityEvaluation"("exampleId");
CREATE INDEX "AgentQualityEvaluation_agentRunId_idx" ON "AgentQualityEvaluation"("agentRunId");

CREATE INDEX "AgentImprovementProposal_userId_target_status_createdAt_idx" ON "AgentImprovementProposal"("userId", "target", "status", "createdAt");
CREATE INDEX "AgentImprovementProposal_skillFeedbackId_idx" ON "AgentImprovementProposal"("skillFeedbackId");

ALTER TABLE "AgentQualityDataset" ADD CONSTRAINT "AgentQualityDataset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentQualityExample" ADD CONSTRAINT "AgentQualityExample_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentQualityExample" ADD CONSTRAINT "AgentQualityExample_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "AgentQualityDataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentQualityExample" ADD CONSTRAINT "AgentQualityExample_skillFeedbackId_fkey" FOREIGN KEY ("skillFeedbackId") REFERENCES "SkillFeedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentQualityExample" ADD CONSTRAINT "AgentQualityExample_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentQualityExample" ADD CONSTRAINT "AgentQualityExample_automationRunId_fkey" FOREIGN KEY ("automationRunId") REFERENCES "ApplicationAutomationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentQualityExample" ADD CONSTRAINT "AgentQualityExample_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentQualityExample" ADD CONSTRAINT "AgentQualityExample_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentQualityEvaluation" ADD CONSTRAINT "AgentQualityEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentQualityEvaluation" ADD CONSTRAINT "AgentQualityEvaluation_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "AgentQualityDataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentQualityEvaluation" ADD CONSTRAINT "AgentQualityEvaluation_exampleId_fkey" FOREIGN KEY ("exampleId") REFERENCES "AgentQualityExample"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentQualityEvaluation" ADD CONSTRAINT "AgentQualityEvaluation_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentImprovementProposal" ADD CONSTRAINT "AgentImprovementProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentImprovementProposal" ADD CONSTRAINT "AgentImprovementProposal_skillFeedbackId_fkey" FOREIGN KEY ("skillFeedbackId") REFERENCES "SkillFeedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;
