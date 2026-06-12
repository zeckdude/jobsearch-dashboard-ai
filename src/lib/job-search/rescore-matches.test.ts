import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFavoritedJobIds } from "@/lib/jobs/favorites";
import { evaluateJobAgainstProfile } from "@/lib/job-search/scoring";
import { rescoreNeedsReviewMatches } from "@/lib/job-search/rescore-matches";
import { checkJobApplicationUrl, staleScoreForUrlHealth } from "@/lib/job-search/url-health";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/jobs/favorites", () => ({
  loadFavoritedJobIds: vi.fn(),
}));

vi.mock("@/lib/job-search/scoring", () => ({
  evaluateJobAgainstProfile: vi.fn(),
}));

vi.mock("@/lib/job-search/url-health", () => ({
  checkJobApplicationUrl: vi.fn(),
  staleScoreForUrlHealth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobProfileMatch: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    jobPosting: {
      update: vi.fn(),
    },
  },
}));

const loadFavoritesMock = vi.mocked(loadFavoritedJobIds);
const evaluateMock = vi.mocked(evaluateJobAgainstProfile);
const checkUrlMock = vi.mocked(checkJobApplicationUrl);
const staleScoreMock = vi.mocked(staleScoreForUrlHealth);
const findMatchesMock = vi.mocked(prisma.jobProfileMatch.findMany);
const deleteMatchesMock = vi.mocked(prisma.jobProfileMatch.deleteMany);
const updateMatchMock = vi.mocked(prisma.jobProfileMatch.update);

const profile = {
  id: "profile_1",
  name: "Frontend",
  userId: "user_1",
};

const baseMatch = {
  id: "match_1",
  jobPosting: {
    id: "job_1",
    title: "Senior Engineer",
    company: "Acme",
    location: "Remote",
    description: "Build UI",
    salaryMin: null,
    salaryMax: null,
    remoteType: "remote",
    staleScore: 0,
    applicationUrl: null,
  },
  jobSearchProfile: profile,
};

describe("rescoreNeedsReviewMatches", () => {
  beforeEach(() => {
    loadFavoritesMock.mockReset();
    evaluateMock.mockReset();
    checkUrlMock.mockReset();
    staleScoreMock.mockReset();
    findMatchesMock.mockReset();
    deleteMatchesMock.mockReset();
    updateMatchMock.mockReset();
    loadFavoritesMock.mockResolvedValue(new Set());
    findMatchesMock.mockResolvedValue([baseMatch] as unknown as Awaited<ReturnType<typeof prisma.jobProfileMatch.findMany>>);
    deleteMatchesMock.mockResolvedValue({ count: 1 });
    updateMatchMock.mockResolvedValue({} as Awaited<ReturnType<typeof prisma.jobProfileMatch.update>>);
  });

  it("queues reject-tier matches for deletion when they are not favorited", async () => {
    evaluateMock.mockReturnValue({
      tier: "reject",
      overallScore: 10,
      titleFit: 0,
      skillFit: 0,
      seniorityFit: 0,
      industryFit: 0,
      compensationFit: 0,
      remoteFit: 0,
      relocationFit: 0,
      strongestMatches: [],
      concerns: [],
      missingKeywords: [],
      failedRequirements: [{ code: "closed", label: "Listing closed", severity: "hard" }],
      passedRequirements: [],
      recommendedAction: "reject",
      aiExplanation: "",
    });

    const result = await rescoreNeedsReviewMatches({ dryRun: true, userId: "user_1" });

    expect(result.toDelete).toBe(1);
    expect(result.skippedFavorites).toBe(0);
    expect(result.sampleDeletes[0]?.protectedFavorite).toBe(false);
  });

  it("skips deleting favorited reject-tier matches but still counts them for update", async () => {
    loadFavoritesMock.mockResolvedValue(new Set(["job_1"]));
    evaluateMock.mockReturnValue({
      tier: "reject",
      overallScore: 10,
      titleFit: 0,
      skillFit: 0,
      seniorityFit: 0,
      industryFit: 0,
      compensationFit: 0,
      remoteFit: 0,
      relocationFit: 0,
      strongestMatches: [],
      concerns: [],
      missingKeywords: [],
      failedRequirements: [{ code: "closed", label: "Listing closed", severity: "hard" }],
      passedRequirements: [],
      recommendedAction: "reject",
      aiExplanation: "",
    });

    const result = await rescoreNeedsReviewMatches({ dryRun: true, userId: "user_1" });

    expect(result.toDelete).toBe(0);
    expect(result.skippedFavorites).toBe(1);
    expect(result.toUpdate).toBe(1);
  });

  it("deletes non-favorite reject-tier matches when confirm is enabled", async () => {
    evaluateMock.mockReturnValue({
      tier: "reject",
      overallScore: 10,
      titleFit: 0,
      skillFit: 0,
      seniorityFit: 0,
      industryFit: 0,
      compensationFit: 0,
      remoteFit: 0,
      relocationFit: 0,
      strongestMatches: [],
      concerns: [],
      missingKeywords: [],
      failedRequirements: [{ code: "closed", label: "Listing closed", severity: "hard" }],
      passedRequirements: [],
      recommendedAction: "reject",
      aiExplanation: "",
    });

    const result = await rescoreNeedsReviewMatches({ dryRun: false, userId: "user_1" });

    expect(deleteMatchesMock).toHaveBeenCalledWith({ where: { id: { in: ["match_1"] } } });
    expect(result.deleted).toBe(1);
    expect(updateMatchMock).not.toHaveBeenCalled();
  });
});
