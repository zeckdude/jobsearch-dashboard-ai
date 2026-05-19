import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCareerStandup } from "@/lib/jolene/career-standup";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: { findMany: vi.fn() },
    agentUserRequest: { count: vi.fn() },
    careerMission: { create: vi.fn(), findUnique: vi.fn() },
    careerSprintSnapshot: { create: vi.fn(), findFirst: vi.fn() },
    jobProfileMatch: { findMany: vi.fn() },
    jobSearchProfile: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

describe("buildCareerStandup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.careerMission.findUnique).mockResolvedValue(mission() as never);
    vi.mocked(prisma.jobSearchProfile.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.agentUserRequest.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.careerSprintSnapshot.create).mockResolvedValue({ id: "snapshot_2" } as never);
    vi.mocked(prisma.jobSearchProfile.findMany).mockResolvedValue([
      { id: "profile_1", name: "Staff Frontend", salaryMin: 180000, salaryMax: 260000, salaryCurrency: "USD", minimumMatchScore: 85 },
    ] as never);
  });

  it("creates a first sprint snapshot with score, money move status, and attention debt", async () => {
    vi.mocked(prisma.careerSprintSnapshot.findFirst).mockResolvedValue(null as never);
    mockPipeline();

    const standup = await buildCareerStandup("user_1", { persist: true });

    expect(standup.snapshotId).toBe("snapshot_2");
    expect(standup.incomeMomentum).toBe("insufficient_data");
    expect(standup.sprintScore).toBeGreaterThan(0);
    expect(standup.attentionDebt).toBe(1);
    expect(standup.moneyMoveStatus[0]).toMatchObject({ status: "new", incomeRelevance: "high" });
    expect(prisma.careerSprintSnapshot.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "user_1",
        sprintScore: standup.sprintScore,
        incomeMomentum: "insufficient_data",
      }),
    }));
  });

  it("marks repeated aging money moves stale and regressing when attention debt rises", async () => {
    const oldCreatedAt = new Date(Date.now() - 3 * 86_400_000);
    vi.mocked(prisma.careerSprintSnapshot.findFirst).mockResolvedValue({
      id: "snapshot_1",
      userId: "user_1",
      missionJson: {},
      briefJson: {},
      moneyMovesJson: [
        {
          key: "submit:/applications/app_1:submit-ready-application-for-acme-ai",
          status: "active",
          createdAt: oldCreatedAt.toISOString(),
        },
      ],
      sprintScore: 90,
      incomeMomentum: "flat",
      attentionDebt: 0,
      completedMoveKeys: [],
      createdAt: oldCreatedAt,
    } as never);
    mockPipeline();

    const standup = await buildCareerStandup("user_1");

    expect(standup.moneyMoveStatus).toEqual(expect.arrayContaining([expect.objectContaining({ status: "stale" })]));
    expect(standup.incomeMomentum).toBe("regressing");
    expect(standup.proactivePromptReason).toContain("aging");
  });
});

function mockPipeline() {
  vi.mocked(prisma.application.findMany)
    .mockResolvedValueOnce([
      {
        id: "app_1",
        status: "ready_to_apply",
        updatedAt: new Date("2026-05-19T12:00:00.000Z"),
        jobPosting: {
          id: "job_1",
          company: "Acme AI",
          title: "Staff AI Product Engineer",
          salaryMin: 200000,
          salaryMax: 260000,
        },
        jobProfileMatch: { overallScore: 92 },
      },
    ] as never)
    .mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([] as never);
  vi.mocked(prisma.jobProfileMatch.findMany).mockResolvedValue([] as never);
}

function mission() {
  return {
    id: "mission_1",
    userId: "user_1",
    targetCompensationMin: 180000,
    targetCompensationIdeal: 240000,
    currency: "USD",
    horizonDays: 30,
    urgencyMode: "HIGH_INCOME_SPRINT",
    tradeoffPolicy: "AGGRESSIVE_BUT_TRUTHFUL",
    roleTracks: ["AI product engineer"],
    dealbreakers: ["unsupported claims"],
    acceptableFallbacks: ["contract"],
    dailyCapacityMinutes: 120,
    energyNotes: null,
    tonePreferences: { directness: "high" },
    createdAt: new Date("2026-05-19T12:00:00.000Z"),
    updatedAt: new Date("2026-05-19T12:00:00.000Z"),
  };
}
