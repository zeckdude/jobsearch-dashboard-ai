import { beforeEach, describe, expect, it, vi } from "vitest";
import { runJobFitScoringAgent } from "@/lib/agents/job-fit-scorer";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/agents/job-fit-scorer", () => ({
  runJobFitScoringAgent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    jobProfileMatch: {
      findMany: vi.fn(),
    },
    jobEvaluation: {
      findMany: vi.fn(),
    },
  },
}));

const findUserMock = vi.mocked(prisma.user.findFirst);
const findMatchesMock = vi.mocked(prisma.jobProfileMatch.findMany);
const findEvaluationsMock = vi.mocked(prisma.jobEvaluation.findMany);
const scoringAgentMock = vi.mocked(runJobFitScoringAgent);

describe("POST /api/jobs/evaluate", () => {
  beforeEach(() => {
    findUserMock.mockReset();
    findMatchesMock.mockReset();
    findEvaluationsMock.mockReset();
    scoringAgentMock.mockReset();
  });

  it("returns a no-op response when every match already has an evaluation", async () => {
    findUserMock.mockResolvedValue({ id: "user_1" } as unknown as Awaited<ReturnType<typeof prisma.user.findFirst>>);
    findMatchesMock.mockResolvedValue([
      { jobPostingId: "job_1", jobSearchProfileId: "profile_1" },
    ] as unknown as Awaited<ReturnType<typeof prisma.jobProfileMatch.findMany>>);
    findEvaluationsMock.mockResolvedValue([
      { jobPostingId: "job_1", jobSearchProfileId: "profile_1" },
    ] as unknown as Awaited<ReturnType<typeof prisma.jobEvaluation.findMany>>);

    const response = await POST(new Request("http://localhost/api/jobs/evaluate", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    }));

    expect(scoringAgentMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      count: 0,
      message: "No jobs needed evaluation.",
    });
  });

  it("evaluates pending matches and clamps the requested limit", async () => {
    findUserMock.mockResolvedValue({ id: "user_1" } as unknown as Awaited<ReturnType<typeof prisma.user.findFirst>>);
    findMatchesMock.mockResolvedValue([
      { jobPostingId: "job_1", jobSearchProfileId: "profile_1" },
      { jobPostingId: "job_2", jobSearchProfileId: "profile_1" },
    ] as unknown as Awaited<ReturnType<typeof prisma.jobProfileMatch.findMany>>);
    findEvaluationsMock.mockResolvedValue([
      { jobPostingId: "job_2", jobSearchProfileId: "profile_1" },
    ] as unknown as Awaited<ReturnType<typeof prisma.jobEvaluation.findMany>>);
    scoringAgentMock.mockResolvedValue({
      output: {
        evaluationId: "eval_1",
        fitScore: 88,
        opportunityScore: 82,
        confidenceScore: 76,
        recommendedAction: "APPLY_NOW",
        recommendedResumeProfile: "Senior Frontend / Product Engineering",
        strengths: ["React"],
        risks: [],
        missingKeywords: [],
        evidenceRefs: ["ev_1"],
        explanation: "Strong match.",
      },
    } as unknown as Awaited<ReturnType<typeof runJobFitScoringAgent>>);

    const response = await POST(new Request("http://localhost/api/jobs/evaluate", {
      method: "POST",
      body: JSON.stringify({ limit: 999 }),
    }));

    expect(findMatchesMock).toHaveBeenCalledWith(expect.objectContaining({ take: 300 }));
    expect(scoringAgentMock).toHaveBeenCalledTimes(1);
    expect(scoringAgentMock).toHaveBeenCalledWith({
      jobPostingId: "job_1",
      jobSearchProfileId: "profile_1",
      userId: "user_1",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      count: 1,
      message: "Evaluated 1 jobs.",
    });
  });
});
