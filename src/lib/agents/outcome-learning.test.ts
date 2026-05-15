import type { Application, ApplicationOutcome, GeneratedCoverLetter, GeneratedResume, JobPosting, JobProfileMatch, JobSearchProfile, JobSource } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildOutcomeLearning } from "@/lib/agents/outcome-learning";

type TestApplication = Application & {
  coverLetter: GeneratedCoverLetter | null;
  jobPosting: JobPosting & { source: JobSource | null };
  jobProfileMatch: (JobProfileMatch & { jobSearchProfile: JobSearchProfile }) | null;
  outcomes: ApplicationOutcome[];
  resume: GeneratedResume | null;
};

describe("buildOutcomeLearning", () => {
  it("calculates callback rate and recommendations by profile", () => {
    const applications = [
      application("applied", "security", "Security SaaS", 88),
      application("screening", "security", "Security SaaS", 91),
      application("rejected_by_company", "security", "Security SaaS", 84),
      application("applied", "frontend", "Generic Frontend", 78),
      application("rejected_by_company", "frontend", "Generic Frontend", 72),
    ];

    const output = buildOutcomeLearning(applications);
    const security = output.profilePerformance.find((profile) => profile.profileId === "security");

    expect(output.sampleSize).toBe(5);
    expect(security?.callbackRate).toBe(33);
    expect(output.recommendations.some((recommendation) => recommendation.includes("small"))).toBe(true);
  });

  it("uses explicit outcome log entries over board status", () => {
    const applications = [
      {
        ...application("applied", "security", "Security SaaS", 90),
        outcomes: [outcome("RECRUITER_SCREEN")],
      },
      {
        ...application("applied", "security", "Security SaaS", 85),
        outcomes: [outcome("REJECTED")],
      },
    ];

    const output = buildOutcomeLearning(applications);
    expect(output.statusCounts.screening).toBe(1);
    expect(output.statusCounts.rejected_by_company).toBe(1);
    expect(output.outcomeCounts.RECRUITER_SCREEN).toBe(1);
  });
});

function application(status: string, profileId: string, profileName: string, score: number): TestApplication {
  const now = new Date();
  return {
    id: `${profileId}-${status}`,
    userId: "user",
    jobPostingId: `${profileId}-job`,
    jobProfileMatchId: `${profileId}-match`,
    status,
    approvedAt: now,
    appliedAt: status === "applied" ? now : null,
    resumeId: null,
    coverLetterId: null,
    notes: null,
    followUpAt: null,
    sourceContactId: null,
    createdAt: now,
    updatedAt: now,
    coverLetter: null,
    outcomes: [],
    jobPosting: {
      id: `${profileId}-job`,
      sourceId: "source",
      sourceJobId: null,
      company: "Example",
      title: "Engineer",
      location: "Remote",
      country: null,
      city: null,
      remoteType: "remote",
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      description: "React TypeScript",
      requirements: [],
      niceToHaves: [],
      benefits: [],
      applicationUrl: null,
      atsProvider: "unknown",
      rawData: {},
      contentHash: `${profileId}-hash`,
      duplicateGroupId: null,
      staleScore: 0,
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
      source: {
        id: "source",
        name: "Manual",
        type: "manual",
        baseUrl: null,
        enabled: true,
        config: {},
        createdAt: now,
        updatedAt: now,
      },
    },
    jobProfileMatch: {
      id: `${profileId}-match`,
      jobPostingId: `${profileId}-job`,
      jobSearchProfileId: profileId,
      status,
      overallScore: score,
      titleFit: score,
      skillFit: score,
      seniorityFit: score,
      industryFit: score,
      compensationFit: score,
      remoteFit: score,
      relocationFit: score,
      strongestMatches: [],
      concerns: [],
      missingKeywords: [],
      recommendedAction: "Review",
      aiExplanation: "",
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
      jobSearchProfile: {
        id: profileId,
        userId: "user",
        name: profileName,
        enabled: true,
        searchIntent: "custom",
        titles: [],
        excludedTitles: [],
        jobTypes: [],
        countries: [],
        regions: [],
        cities: [],
        remotePreference: "remote_us_only",
        relocationPreference: "unknown",
        salaryCurrency: "USD",
        salaryMin: null,
        salaryMax: null,
        includeUnknownSalary: true,
        industries: [],
        preferredCompanies: [],
        excludedCompanies: [],
        keywordsRequired: [],
        keywordsPreferred: [],
        keywordsExcluded: [],
        minimumMatchScore: 75,
        maxResultsPerRun: 50,
        scheduleEnabled: true,
        cronExpression: null,
        emailDigestEnabled: true,
        pushNotificationsEnabled: false,
        minimumPushScore: 85,
        createdAt: now,
        updatedAt: now,
      },
    },
    resume: null,
  } as unknown as TestApplication;
}

function outcome(value: "RECRUITER_SCREEN" | "REJECTED"): ApplicationOutcome {
  const now = new Date();
  return {
    id: `outcome-${value}`,
    userId: "user",
    applicationId: "application",
    jobPostingId: "job",
    outcome: value,
    notes: null,
    occurredAt: now,
    createdAt: now,
  };
}
