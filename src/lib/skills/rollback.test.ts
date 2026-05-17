import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { rejectSkillAdjustment } from "@/lib/skills/rollback";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skillAdjustment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const findAdjustmentMock = vi.mocked(prisma.skillAdjustment.findFirst);
const updateAdjustmentMock = vi.mocked(prisma.skillAdjustment.update);

describe("skill adjustment rollback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findAdjustmentMock.mockResolvedValue({
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
    } as never);
    updateAdjustmentMock.mockImplementation((input) => ({ id: (input as any).where.id, ...(input as any).data }) as never);
  });

  it("marks an adjustment rejected and preserves patch metadata", async () => {
    const result = await rejectSkillAdjustment({
      adjustmentId: "adjustment_1",
      userId: "user_1",
      reason: "It made the scoring worse.",
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
        }),
      }),
    }));
    expect(result).toMatchObject({ status: "REJECTED" });
  });

  it("fails when the adjustment is missing or not owned by the user", async () => {
    findAdjustmentMock.mockResolvedValue(null);

    await expect(rejectSkillAdjustment({ adjustmentId: "adjustment_2", userId: "user_1" })).rejects.toThrow("Skill adjustment not found.");
    expect(updateAdjustmentMock).not.toHaveBeenCalled();
  });
});
