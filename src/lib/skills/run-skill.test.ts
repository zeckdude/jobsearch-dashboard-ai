import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { runSkill } from "@/lib/skills/run-skill";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skillAdjustment: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/skills/registry", () => ({
  skillRegistry: {
    job_fit_scorer: {
      id: "job_fit_scorer",
      label: "Job fit scorer",
      agentType: "JOB_FIT_SCORER",
      riskLevel: "LOW",
      inputSchema: { parse: vi.fn((input) => input) },
      outputSchema: { parse: vi.fn((output) => output) },
      defaultPolicy: { mutatesLocalData: false, externalAction: "none", autoApplyLearningKinds: [] },
      execute: vi.fn(async () => ({ ok: true })),
    },
  },
}));

const findAdjustmentsMock = vi.mocked(prisma.skillAdjustment.findMany);

describe("runSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findAdjustmentsMock.mockResolvedValue([] as never);
  });

  it("loads only active adjustments for future skill runs", async () => {
    await runSkill({ skillId: "job_fit_scorer", input: {}, userId: "user_1" });

    expect(findAdjustmentsMock).toHaveBeenCalledWith({
      where: { userId: "user_1", skillId: "job_fit_scorer", status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
  });
});
