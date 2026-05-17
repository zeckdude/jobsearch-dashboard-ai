-- Add source type for learned-rule rollback quality examples.
ALTER TYPE "AgentQualityExampleSource" ADD VALUE IF NOT EXISTS 'ROLLBACK';
