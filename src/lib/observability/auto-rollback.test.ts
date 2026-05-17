import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLearningImpact, type LearningImpactItem } from "@/lib/observability/learning-impact";
import { autoRollbackEligibility, runLearningAutoRollback } from "@/lib/observability/auto-rollback";
import { rejectSkillAdjustment } from "@/lib/skills/rollback";

vi.mock("@/lib/observability/learning-impact", () => ({
  getLearningImpact: vi.fn(),
}));

vi.mock("@/lib/skills/rollback", () => ({
  rejectSkillAdjustment: vi.fn(),
}));

const getLearningImpactMock = vi.mocked(getLearningImpact);
const rejectSkillAdjustmentMock = vi.mocked(rejectSkillAdjustment);

describe("learning auto rollback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLearningImpactMock.mockResolvedValue([]);
    rejectSkillAdjustmentMock.mockResolvedValue({ id: "adjustment_1", status: "REJECTED" } as never);
  });

  it("requires needs-review status, enough samples, and a failure signal", () => {
    expect(autoRollbackEligibility(impact({ status: "needs_review", appliedRunCount: 2, relatedFailedCount: 1 }))).toMatchObject({ eligible: true });
    expect(autoRollbackEligibility(impact({ status: "needs_review", appliedRunCount: 2, relatedNeedsReviewCount: 2 }))).toMatchObject({ eligible: true });
    expect(autoRollbackEligibility(impact({ status: "helping", appliedRunCount: 4, relatedFailedCount: 2 }))).toMatchObject({ eligible: false });
    expect(autoRollbackEligibility(impact({ status: "neutral", appliedRunCount: 4, relatedFailedCount: 2 }))).toMatchObject({ eligible: false });
    expect(autoRollbackEligibility(impact({ status: "insufficient_data", appliedRunCount: 0, relatedFailedCount: 2 }))).toMatchObject({ eligible: false });
    expect(autoRollbackEligibility(impact({ status: "needs_review", appliedRunCount: 1, relatedFailedCount: 1 }))).toMatchObject({ eligible: false });
  });

  it("does not reject adjustments during dry run", async () => {
    getLearningImpactMock.mockResolvedValue([
      impact({ adjustmentId: "adjustment_1", status: "needs_review", appliedRunCount: 2, relatedFailedCount: 1 }),
    ]);

    const result = await runLearningAutoRollback({ userId: "user_1", dryRun: true });

    expect(result).toMatchObject({ scanned: 1, eligible: 1, rolledBack: 0 });
    expect(rejectSkillAdjustmentMock).not.toHaveBeenCalled();
  });

  it("rejects eligible adjustments during live run with impact context", async () => {
    getLearningImpactMock.mockResolvedValue([
      impact({ adjustmentId: "adjustment_1", status: "needs_review", appliedRunCount: 2, relatedFailedCount: 1, averageScore: 42 }),
      impact({ adjustmentId: "adjustment_2", status: "helping", appliedRunCount: 3, averageScore: 90 }),
    ]);

    const result = await runLearningAutoRollback({ userId: "user_1" });

    expect(result).toMatchObject({ scanned: 2, eligible: 1, rolledBack: 1 });
    expect(rejectSkillAdjustmentMock).toHaveBeenCalledTimes(1);
    expect(rejectSkillAdjustmentMock).toHaveBeenCalledWith(expect.objectContaining({
      adjustmentId: "adjustment_1",
      userId: "user_1",
      source: "auto_learning_rollback",
      impact: {
        status: "needs_review",
        appliedRunCount: 2,
        relatedFailedCount: 1,
        relatedNeedsReviewCount: 0,
        averageScore: 42,
      },
    }));
  });
});

function impact(input: Partial<LearningImpactItem>): LearningImpactItem {
  return {
    adjustmentId: input.adjustmentId ?? "adjustment_1",
    skillId: input.skillId ?? "job_fit_scorer",
    category: input.category ?? "high_score_user_rejected",
    proposalId: input.proposalId ?? "proposal_1",
    rationale: input.rationale ?? "Activated learning.",
    status: input.status ?? "needs_review",
    impactSummary: input.impactSummary ?? "Learning needs review.",
    appliedRunCount: input.appliedRunCount ?? 0,
    latestAppliedAt: input.latestAppliedAt ?? null,
    relatedFailedCount: input.relatedFailedCount ?? 0,
    relatedNeedsReviewCount: input.relatedNeedsReviewCount ?? 0,
    averageScore: input.averageScore ?? null,
    target: input.target ?? "JOB_MATCHING",
    activeSince: input.activeSince ?? new Date("2026-05-17T10:00:00.000Z"),
  };
}
