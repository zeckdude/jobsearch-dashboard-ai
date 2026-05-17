import { getLearningImpact, type LearningImpactItem } from "@/lib/observability/learning-impact";
import { rejectSkillAdjustment } from "@/lib/skills/rollback";

export type AutoRollbackResult = {
  adjustmentId: string;
  skillId: string;
  category: string | null;
  status: LearningImpactItem["status"];
  eligible: boolean;
  reason: string;
  rolledBack: boolean;
};

export type AutoRollbackSummary = {
  scanned: number;
  eligible: number;
  rolledBack: number;
  results: AutoRollbackResult[];
};

export async function runLearningAutoRollback(input: { userId?: string | null; dryRun?: boolean } = {}): Promise<AutoRollbackSummary> {
  const impact = await getLearningImpact(input.userId);
  const results: AutoRollbackResult[] = [];

  for (const item of impact) {
    const eligibility = autoRollbackEligibility(item);
    let rolledBack = false;
    if (eligibility.eligible && !input.dryRun) {
      await rejectSkillAdjustment({
        adjustmentId: item.adjustmentId,
        userId: input.userId,
        reason: eligibility.reason,
        source: "auto_learning_rollback",
        impact: impactSnapshot(item),
      });
      rolledBack = true;
    }

    results.push({
      adjustmentId: item.adjustmentId,
      skillId: item.skillId,
      category: item.category,
      status: item.status,
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      rolledBack,
    });
  }

  return {
    scanned: impact.length,
    eligible: results.filter((result) => result.eligible).length,
    rolledBack: results.filter((result) => result.rolledBack).length,
    results,
  };
}

export function autoRollbackEligibility(item: Pick<LearningImpactItem, "status" | "appliedRunCount" | "relatedFailedCount" | "relatedNeedsReviewCount">) {
  if (item.status !== "needs_review") {
    return { eligible: false, reason: `Impact status is ${item.status}.` };
  }
  if (item.appliedRunCount < 2) {
    return { eligible: false, reason: "Needs at least 2 applied runs before auto rollback." };
  }
  if (item.relatedFailedCount >= 1) {
    return { eligible: true, reason: `Auto rollback: learning needs review after ${item.appliedRunCount} applied runs with ${item.relatedFailedCount} failed evaluation(s).` };
  }
  if (item.relatedNeedsReviewCount >= 2) {
    return { eligible: true, reason: `Auto rollback: learning needs review after ${item.appliedRunCount} applied runs with ${item.relatedNeedsReviewCount} needs-review evaluation(s).` };
  }
  return { eligible: false, reason: "Needs a failed evaluation or at least 2 needs-review evaluations." };
}

function impactSnapshot(item: LearningImpactItem) {
  return {
    status: item.status,
    appliedRunCount: item.appliedRunCount,
    relatedFailedCount: item.relatedFailedCount,
    relatedNeedsReviewCount: item.relatedNeedsReviewCount,
    averageScore: item.averageScore,
  };
}
