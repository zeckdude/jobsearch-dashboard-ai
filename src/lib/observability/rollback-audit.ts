import type { AgentImprovementProposalStatus, AgentQualityTarget, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LearningRollbackAuditItem = {
  adjustmentId: string;
  skillId: string;
  kind: string;
  riskLevel: string;
  source: string;
  sourceLabel: string;
  reason: string | null;
  disabledAt: Date | null;
  category: string | null;
  proposalId: string | null;
  target: AgentQualityTarget | null;
  impact: {
    status: string | null;
    appliedRunCount: number | null;
    relatedFailedCount: number | null;
    relatedNeedsReviewCount: number | null;
    averageScore: number | null;
  };
  rollbackExampleCount: number;
  rollbackProposalCount: number;
  latestProposalStatus: AgentImprovementProposalStatus | null;
  createdAt: Date;
};

export async function getLearningRollbackAudit(userId: string, limit = 25): Promise<LearningRollbackAuditItem[]> {
  const adjustments = await prisma.skillAdjustment.findMany({
    where: { userId, status: "REJECTED" },
    orderBy: { updatedAt: "desc" },
    take: Math.max(limit * 3, limit),
  });

  const rollbackAdjustments = adjustments
    .filter((adjustment) => hasRollbackMetadata(objectValue(adjustment.patchJson)))
    .slice(0, limit);
  if (!rollbackAdjustments.length) return [];

  const [examples, proposals] = await Promise.all([
    prisma.agentQualityExample.findMany({
      where: {
        userId,
        source: "ROLLBACK",
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.agentImprovementProposal.findMany({
      where: {
        userId,
        metadataJson: { path: ["source"], equals: "rollback_learning" },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return rollbackAdjustments.map((adjustment) => {
    const patch = objectValue(adjustment.patchJson);
    const category = stringValue(patch.category);
    const target = targetForSkill(adjustment.skillId);
    const source = stringValue(patch.disabledSource) ?? "unknown";
    const matchingExamples = examples.filter((example) => {
      const metadata = objectValue(example.metadataJson);
      if (metadata.adjustmentId === adjustment.id) return true;
      return target && example.target === target && example.failureCategory === category;
    });
    const matchingProposals = proposals.filter((proposal) => {
      const metadata = objectValue(proposal.metadataJson);
      return target && proposal.target === target && metadata.rollbackCategory === category;
    });

    return {
      adjustmentId: adjustment.id,
      skillId: adjustment.skillId,
      kind: adjustment.kind,
      riskLevel: adjustment.riskLevel,
      source,
      sourceLabel: sourceLabel(source),
      reason: stringValue(patch.disabledReason),
      disabledAt: dateValue(patch.disabledAt),
      category,
      proposalId: stringValue(patch.proposalId),
      target,
      impact: rollbackImpact(patch.rollbackImpact),
      rollbackExampleCount: matchingExamples.length,
      rollbackProposalCount: matchingProposals.length,
      latestProposalStatus: matchingProposals[0]?.status ?? null,
      createdAt: adjustment.createdAt,
    };
  });
}

function hasRollbackMetadata(patch: Record<string, unknown>) {
  return Boolean(patch.disabledAt || patch.disabledSource || patch.rollbackLearningCaptured || patch.rollbackImpact);
}

function rollbackImpact(value: unknown): LearningRollbackAuditItem["impact"] {
  const impact = objectValue(value);
  return {
    status: stringValue(impact.status),
    appliedRunCount: numberValue(impact.appliedRunCount),
    relatedFailedCount: numberValue(impact.relatedFailedCount),
    relatedNeedsReviewCount: numberValue(impact.relatedNeedsReviewCount),
    averageScore: numberValue(impact.averageScore),
  };
}

function targetForSkill(skillId: string): AgentQualityTarget | null {
  if (skillId === "job_fit_scorer") return "JOB_MATCHING";
  if (skillId === "duplicate_stale_job_detector" || skillId === "search_profile_manager") return "JOB_SEARCH";
  if (skillId === "application_qa") return "APPLICATION_ASSISTANT";
  if (skillId === "approve_agency_match") return "RECRUITING_AGENCY";
  return null;
}

function sourceLabel(source: string) {
  if (source === "auto_learning_rollback") return "auto rollback";
  if (source === "settings_learning_impact") return "learning impact";
  if (source === "learning_audit_log") return "audit log";
  return source.replace(/_/g, " ");
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
