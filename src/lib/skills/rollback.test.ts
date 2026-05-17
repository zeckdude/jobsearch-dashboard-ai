import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { rejectSkillAdjustment } from "@/lib/skills/rollback";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skillAdjustment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    agentQualityDataset: {
      upsert: vi.fn(),
    },
    agentQualityExample: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    agentImprovementProposal: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const findAdjustmentMock = vi.mocked(prisma.skillAdjustment.findFirst);
const updateAdjustmentMock = vi.mocked(prisma.skillAdjustment.update);
const datasetUpsertMock = vi.mocked(prisma.agentQualityDataset.upsert);
const exampleFindFirstMock = vi.mocked(prisma.agentQualityExample.findFirst);
const exampleFindManyMock = vi.mocked(prisma.agentQualityExample.findMany);
const exampleCreateMock = vi.mocked(prisma.agentQualityExample.create);
const proposalFindFirstMock = vi.mocked(prisma.agentImprovementProposal.findFirst);
const proposalCreateMock = vi.mocked(prisma.agentImprovementProposal.create);

describe("skill adjustment rollback", () => {
  let activeAdjustment: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    activeAdjustment = {
      id: "adjustment_1",
      userId: "user_1",
      skillId: "job_fit_scorer",
      kind: "GUIDANCE",
      riskLevel: "LOW",
      status: "ACTIVE",
      patchJson: { source: "quality_proposal", category: "high_score_user_rejected" },
      rationale: "Activated learning.",
      feedbackId: null,
      supersedesId: null,
      appliedAt: new Date("2026-05-17T10:00:00.000Z"),
      createdAt: new Date("2026-05-17T10:00:00.000Z"),
      updatedAt: new Date("2026-05-17T10:00:00.000Z"),
    };
    findAdjustmentMock.mockResolvedValue(activeAdjustment as never);
    updateAdjustmentMock.mockImplementation((input) => ({
      ...activeAdjustment,
      ...(input as any).data,
    }) as never);
    datasetUpsertMock.mockResolvedValue({ id: "dataset_1" } as never);
    exampleFindFirstMock.mockResolvedValue(null);
    exampleFindManyMock.mockResolvedValue([{ id: "example_1" }] as never);
    exampleCreateMock.mockImplementation((input) => ({ id: "example_1", ...(input as any).data }) as never);
    proposalFindFirstMock.mockResolvedValue(null);
    proposalCreateMock.mockResolvedValue({ id: "proposal_1" } as never);
  });

  it("marks an adjustment rejected, preserves patch metadata, and captures rollback learning", async () => {
    const result = await rejectSkillAdjustment({
      adjustmentId: "adjustment_1",
      userId: "user_1",
      reason: "It made the scoring worse.",
      impact: {
        status: "needs_review",
        appliedRunCount: 3,
        relatedFailedCount: 1,
        relatedNeedsReviewCount: 2,
        averageScore: 45,
      },
    });

    expect(findAdjustmentMock).toHaveBeenCalledWith({
      where: {
        id: "adjustment_1",
        userId: "user_1",
      },
    });
    expect(updateAdjustmentMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "adjustment_1" },
      data: expect.objectContaining({
        status: "REJECTED",
        patchJson: expect.objectContaining({
          source: "quality_proposal",
          category: "high_score_user_rejected",
          disabledSource: "settings_learning_impact",
          disabledReason: "It made the scoring worse.",
          rollbackLearningCaptured: true,
          rollbackImpact: expect.objectContaining({ status: "needs_review", appliedRunCount: 3 }),
        }),
      }),
    }));
    expect(exampleCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "user_1",
        target: "JOB_MATCHING",
        source: "ROLLBACK",
        failureCategory: "high_score_user_rejected",
        summary: "It made the scoring worse.",
        metadataJson: expect.objectContaining({
          source: "rollback_learning",
          adjustmentId: "adjustment_1",
          category: "high_score_user_rejected",
        }),
      }),
    }));
    expect(proposalCreateMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "REJECTED" });
  });

  it("creates a review-only proposal after repeated rollback examples", async () => {
    exampleFindManyMock.mockResolvedValue([{ id: "example_1" }, { id: "example_2" }] as never);

    await rejectSkillAdjustment({
      adjustmentId: "adjustment_1",
      userId: "user_1",
      reason: "Repeated rollback.",
    });

    expect(proposalCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "user_1",
        target: "JOB_MATCHING",
        type: "CLASSIFIER",
        status: "PROPOSED",
        riskLevel: "LOW",
        affectedExampleIds: ["example_1", "example_2"],
        metadataJson: expect.objectContaining({
          source: "rollback_learning",
          rollbackCategory: "high_score_user_rejected",
        }),
      }),
    }));
  });

  it("fails when the adjustment is missing or not owned by the user", async () => {
    findAdjustmentMock.mockResolvedValue(null);

    await expect(rejectSkillAdjustment({ adjustmentId: "adjustment_2", userId: "user_1" })).rejects.toThrow("Skill adjustment not found.");
    expect(updateAdjustmentMock).not.toHaveBeenCalled();
    expect(exampleCreateMock).not.toHaveBeenCalled();
  });
});
