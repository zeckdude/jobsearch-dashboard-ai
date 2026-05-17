ALTER TABLE "AgentRun"
ADD COLUMN "observabilityJson" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "ApplicationAutomationRun"
ADD COLUMN "observabilityJson" JSONB NOT NULL DEFAULT '{}';
