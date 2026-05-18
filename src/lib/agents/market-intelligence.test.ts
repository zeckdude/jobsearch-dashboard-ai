import { describe, expect, it } from "vitest";
import { buildMarketIntelligenceReport } from "@/lib/agents/market-intelligence";

describe("market intelligence agent", () => {
  it("builds a review-only market brief from internal jobs and cited sources", () => {
    const report = buildMarketIntelligenceReport({
      lookbackDays: 45,
      generatedAt: new Date("2026-05-18T12:00:00.000Z"),
      profiles: [
        {
          id: "profile_1",
          name: "AI Product Frontend",
          performanceSnapshots: [{ healthScore: 72 }],
        } as any,
        {
          id: "profile_2",
          name: "Noisy Generic Frontend",
          performanceSnapshots: [{ healthScore: 44 }],
        } as any,
      ],
      candidateTerms: ["React", "TypeScript", "RAG", "Design Systems"],
      sources: [
        {
          title: "Indeed Hiring Lab",
          publisher: "Indeed",
          url: "https://www.hiringlab.org/",
          signal: "Posting trend context.",
          status: "checked",
        },
      ],
      matches: [
        match({
          company: "Terzo",
          title: "Frontend Engineer",
          description: "React TypeScript AI agents workflow analytics enterprise SaaS",
          recommendedAction: "APPLY_NOW",
          overallScore: 93,
          applicationOutcome: "RECRUITER_SCREEN",
        }),
        match({
          company: "Linear",
          title: "Product Engineer",
          description: "React TypeScript workflow dashboard enterprise",
          recommendedAction: "MAYBE_APPLY",
          overallScore: 86,
        }),
      ],
    });

    expect(report.marketTemperature[0]).toMatchObject({
      lane: "AI product/frontend",
      jobCount: 2,
    });
    expect(report.skillSignals.find((signal) => signal.skill === "React")).toMatchObject({
      mentions: 2,
    });
    expect(report.recommendedActions.every((action) => action.reviewOnly)).toBe(true);
    expect(report.sourceDigest[0]).toMatchObject({
      title: "Indeed Hiring Lab",
      url: "https://www.hiringlab.org/",
    });
  });
});

function match(input: {
  company: string;
  title: string;
  description: string;
  recommendedAction: string;
  overallScore: number;
  applicationOutcome?: string;
}) {
  return {
    status: "needs_review",
    overallScore: input.overallScore,
    jobSearchProfileId: "profile_1",
    jobPosting: {
      id: `${input.company}-${input.title}`,
      company: input.company,
      title: input.title,
      description: input.description,
      requirements: [],
      niceToHaves: [],
      lastSeenAt: new Date("2026-05-18T00:00:00.000Z"),
      evaluations: [{ recommendedAction: input.recommendedAction, fitScore: input.overallScore, opportunityScore: 80 }],
      applications: input.applicationOutcome
        ? [{ status: "applied", outcomes: [{ outcome: input.applicationOutcome }] }]
        : [],
    },
  } as any;
}
