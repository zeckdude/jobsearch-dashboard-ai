import type { AgentQualityTarget, Prisma, SkillAdjustment } from "@prisma/client";
import { ensureAgentQualityDataset } from "@/lib/observability/quality";
import { prisma } from "@/lib/prisma";

export type RejectSkillAdjustmentInput = {
  adjustmentId: string;
  userId?: string | null;
  reason?: string | null;
  source?: string;
  impact?: RollbackImpactContext | null;
};

export type RollbackImpactContext = {
  status?: string | null;
  appliedRunCount?: number | null;
  relatedFailedCount?: number | null;
  relatedNeedsReviewCount?: number | null;
  averageScore?: number | null;
};

export async function rejectSkillAdjustment(input: RejectSkillAdjustmentInput): Promise<SkillAdjustment> {
  const existing = await prisma.skillAdjustment.findFirst({
    where: {
      id: input.adjustmentId,
      ...(input.userId ? { userId: input.userId } : {}),
    },
  });

  if (!existing) throw new Error("Skill adjustment not found.");

  const patch = objectValue(existing.patchJson);
  const disabledAt = new Date().toISOString();
  const disabledReason = input.reason?.trim();
  const rollbackLearningCaptured = shouldCaptureRollbackLearning(existing, patch);

  const updated = await prisma.skillAdjustment.update({
    where: { id: existing.id },
    data: {
      status: "REJECTED",
      patchJson: {
        ...patch,
        disabledAt,
        disabledSource: input.source ?? "settings_learning_impact",
        ...(disabledReason ? { disabledReason } : {}),
        ...(rollbackLearningCaptured ? { rollbackLearningCaptured: true } : {}),
        ...(input.impact ? { rollbackImpact: input.impact } : {}),
      },
    },
  });

  if (rollbackLearningCaptured) {
    await createRollbackQualitySignal(updated, {
      reason: disabledReason,
      source: input.source ?? "settings_learning_impact",
      impact: input.impact,
    });
  }

  return updated;
}

function objectValue(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function shouldCaptureRollbackLearning(adjustment: SkillAdjustment, patch: Record<string, unknown>) {
  return adjustment.status === "ACTIVE" && patch.source === "quality_proposal";
}

async function createRollbackQualitySignal(
  adjustment: SkillAdjustment,
  input: { reason?: string | null; source: string; impact?: RollbackImpactContext | null },
) {
  const patch = objectValue(adjustment.patchJson);
  const target = targetForSkill(adjustment.skillId);
  if (!target) return null;

  const category = typeof patch.category === "string" && patch.category.trim()
    ? patch.category
    : "learning_rule_rollback";
  const existing = await prisma.agentQualityExample.findFirst({
    where: {
      userId: adjustment.userId,
      target,
      source: "ROLLBACK",
      metadataJson: { path: ["adjustmentId"], equals: adjustment.id },
    },
  });
  if (existing) return existing;

  const dataset = await ensureAgentQualityDataset(adjustment.userId, target);
  const example = await prisma.agentQualityExample.create({
    data: {
      userId: adjustment.userId,
      datasetId: dataset.id,
      target,
      source: "ROLLBACK",
      title: `Rolled back ${adjustment.skillId.replaceAll("_", " ")} learning`,
      summary: input.reason || `Disabled learned rule for ${adjustment.skillId}.`,
      failureCategory: category,
      inputJson: {
        skillId: adjustment.skillId,
        kind: adjustment.kind,
        riskLevel: adjustment.riskLevel,
        proposalId: typeof patch.proposalId === "string" ? patch.proposalId : null,
        category,
      },
      expectedJson: {
        expectedBehavior: "Accepted learning should improve future runs and be easy to roll back when it does not help.",
      },
      actualJson: {
        status: "REJECTED",
        disabledReason: input.reason ?? null,
        impact: input.impact ?? null,
      },
      metadataJson: {
        source: "rollback_learning",
        disabledSource: input.source,
        adjustmentId: adjustment.id,
        proposalId: typeof patch.proposalId === "string" ? patch.proposalId : null,
        category,
      },
    },
  });

  await maybeCreateRollbackProposal(adjustment.userId, target, category);
  return example;
}

async function maybeCreateRollbackProposal(userId: string, target: AgentQualityTarget, category: string) {
  const examples = await prisma.agentQualityExample.findMany({
    where: {
      userId,
      target,
      source: "ROLLBACK",
      failureCategory: category,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  if (examples.length < 2) return null;

  const existing = await prisma.agentImprovementProposal.findFirst({
    where: {
      userId,
      target,
      status: "PROPOSED",
      metadataJson: { path: ["rollbackCategory"], equals: category },
    },
  });
  if (existing) return existing;

  return prisma.agentImprovementProposal.create({
    data: {
      userId,
      target,
      type: proposalTypeForRollback(target),
      status: "PROPOSED",
      riskLevel: "LOW",
      title: `Review rolled-back ${target.toLowerCase().replaceAll("_", " ")} learning`,
      summary: `Detected ${examples.length} rollback example(s) for learned-rule category ${category}.`,
      rationale: "Repeated rollback means an accepted learned rule may be too broad, incorrectly mapped, or not supported by later run quality. Review before activating replacement learning.",
      affectedExampleIds: examples.map((example) => example.id) as Prisma.InputJsonValue,
      patchJson: {
        category,
        target,
        policy: "proposal_only",
        recommendedChange: "Review the accepted learning rule mapping before creating replacement guidance.",
      },
      metadataJson: {
        source: "rollback_learning",
        rollbackCategory: category,
        exampleCount: examples.length,
      },
    },
  });
}

function targetForSkill(skillId: string): AgentQualityTarget | null {
  if (skillId === "job_fit_scorer") return "JOB_MATCHING";
  if (skillId === "duplicate_stale_job_detector" || skillId === "search_profile_manager") return "JOB_SEARCH";
  if (skillId === "application_qa") return "APPLICATION_ASSISTANT";
  if (skillId === "approve_agency_match") return "RECRUITING_AGENCY";
  return null;
}

function proposalTypeForRollback(target: AgentQualityTarget) {
  if (target === "JOB_MATCHING") return "CLASSIFIER";
  return "WORKFLOW";
}
