import type { JobSearchProfile } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { evaluateJobAgainstProfile, scoreJobForProfile } from "@/lib/job-search/scoring";

describe("evaluateJobAgainstProfile", () => {
  function usRemoteProfile(overrides: Partial<JobSearchProfile> = {}) {
    return {
      name: "US Remote Senior Frontend",
      titles: ["Senior Frontend Engineer", "Senior Full Stack Engineer", "Senior Software Engineer", "Full-stack"],
      keywordsRequired: [],
      keywordsPreferred: ["React", "TypeScript", "frontend", "UI", "web"],
      keywordsExcluded: [],
      excludedCompanies: [],
      excludedTitles: ["Staff", "Principal", "Lead", "Manager"],
      industries: [],
      includeUnknownSalary: true,
      minimumMatchScore: 75,
      remotePreference: "remote_us_only",
      remotePreferences: ["remote_us_only"],
      relocationPreference: "unknown",
      countries: ["United States"],
      cities: [],
      salaryMin: 175000,
      salaryCurrency: "USD",
      ...overrides,
    } as unknown as JobSearchProfile;
  }

  function lasVegasProfile(overrides: Partial<JobSearchProfile> = {}) {
    return {
      name: "Las Vegas Hybrid or On-site roles",
      titles: ["Senior Frontend Engineer"],
      keywordsRequired: [],
      keywordsPreferred: ["React", "TypeScript"],
      keywordsExcluded: [],
      excludedCompanies: [],
      excludedTitles: [],
      industries: [],
      includeUnknownSalary: true,
      minimumMatchScore: 75,
      remotePreference: "hybrid",
      remotePreferences: ["hybrid", "onsite_relocation"],
      relocationPreference: "open_to_relocation",
      countries: ["United States"],
      cities: ["Las Vegas"],
      salaryMin: 175000,
      salaryCurrency: "USD",
      ...overrides,
    } as unknown as JobSearchProfile;
  }

  it("full match: senior frontend remote US with salary", () => {
    const result = evaluateJobAgainstProfile(
      {
        company: "SaaS Co",
        title: "Senior Frontend Engineer",
        location: "Remote, United States",
        remoteType: "remote",
        description: "Build React and TypeScript product UI for SaaS workflows.",
        salaryMin: 180000,
        salaryMax: 220000,
      },
      usRemoteProfile(),
    );
    expect(result.tier).toBe("full");
    expect(result.overallScore).toBeGreaterThanOrEqual(85);
  });

  it("partial: unknown salary on otherwise matching remote US role", () => {
    const result = evaluateJobAgainstProfile(
      {
        company: "SaaS Co",
        title: "Senior Frontend Engineer",
        location: "Remote, United States",
        remoteType: "remote",
        description: "Build React and TypeScript product UI.",
      },
      usRemoteProfile(),
    );
    expect(result.tier).toBe("partial");
    expect(result.failedRequirements.some((f) => f.code === "salary")).toBe(true);
  });

  it("reject: Cognition on-site SF for remote US profile (listing 1)", () => {
    const result = evaluateJobAgainstProfile(
      {
        company: "Cognition",
        title: "Product Engineer",
        location: "San Francisco",
        remoteType: "onsite",
        description: "On-site role in San Francisco and New York City. Build AI product experiences with React.",
        salaryMin: 200000,
      },
      usRemoteProfile(),
    );
    expect(result.tier).toBe("reject");
    expect(result.failedRequirements.some((f) => f.code === "remote_type")).toBe(true);
  });

  it("reject: India remote for US profile (listing 2)", () => {
    const result = evaluateJobAgainstProfile(
      {
        company: "Smart Working Solutions",
        title: "Senior Product Engineer (Remote, Full-Time)",
        location: "India / Ahmedabad / Bangalore / Chennai",
        remoteType: "remote",
        description: "Remote engineering role across India offices.",
        salaryMin: 150000,
      },
      usRemoteProfile(),
    );
    expect(result.tier).toBe("reject");
    expect(result.failedRequirements.some((f) => f.code === "geography")).toBe(true);
  });

  it("reject: OpenAI hybrid SF for remote US profile (listing 3)", () => {
    const result = evaluateJobAgainstProfile(
      {
        company: "OpenAI",
        title: "Full Stack Engineer, Fleet Scheduling",
        location: "San Francisco",
        remoteType: "hybrid",
        description: "Hybrid role in San Francisco building React dashboards.",
        salaryMin: 230000,
      },
      usRemoteProfile(),
    );
    expect(result.tier).toBe("reject");
    expect(result.failedRequirements.some((f) => f.code === "remote_type")).toBe(true);
  });

  it("reject: dead listing (listing 4)", () => {
    const result = evaluateJobAgainstProfile(
      {
        company: "Mercor",
        title: "Remote Frontend Software Engineer",
        location: "Remote",
        remoteType: "remote",
        description: "Freelance contract, 100% remote.",
        urlHealth: "dead",
      },
      usRemoteProfile(),
    );
    expect(result.tier).toBe("reject");
    expect(result.failedRequirements.some((f) => f.code === "listing_alive")).toBe(true);
  });

  it("reject: Egypt remote + closed (listing 5)", () => {
    const result = evaluateJobAgainstProfile(
      {
        company: "Robusta",
        title: "Frontend Engineer - 6 months contract",
        location: "Remote · Cairo, Egypt",
        remoteType: "remote",
        description: "Remote role based in Cairo for Egyptian company.",
        staleScore: 90,
      },
      usRemoteProfile(),
    );
    expect(result.tier).toBe("reject");
  });

  it("reject: Fastly Finance Analyst wrong city and low salary (listing 7)", () => {
    const result = evaluateJobAgainstProfile(
      {
        company: "Fastly",
        title: "Finance Systems Analyst",
        location: "Denver, CO; New York City, NY",
        remoteType: "hybrid",
        description: "Hybrid near local office. Salary $97,070 to $137,040.",
        salaryMin: 97070,
        salaryMax: 137040,
      },
      lasVegasProfile(),
    );
    expect(result.tier).toBe("reject");
    expect(result.failedRequirements.some((f) => f.code === "title_match")).toBe(true);
    expect(result.failedRequirements.some((f) => f.code === "geography")).toBe(true);
  });

  it("reject: staff titles when profile excludes them", () => {
    const profile = usRemoteProfile();
    const result = evaluateJobAgainstProfile(
      {
        company: "SaaS Co",
        title: "Staff Engineer - Frontend",
        location: "Remote, United States",
        remoteType: "remote",
        description: "React TypeScript frontend.",
        salaryMin: 200000,
      },
      profile,
    );
    expect(result.tier).toBe("reject");
  });

  it("reject: finance and PM titles", () => {
    const profile = usRemoteProfile();
    const jobs = [
      { title: "Senior Data Engineer", description: "Analytics pipelines." },
      { title: "Senior Developer Advocate", description: "DevRel content." },
    ];
    for (const job of jobs) {
      const result = evaluateJobAgainstProfile(
        { company: "Co", title: job.title, location: "Remote, US", remoteType: "remote", description: job.description, salaryMin: 200000 },
        profile,
      );
      expect(result.tier).toBe("reject");
    }
  });
});

describe("scoreJobForProfile backward compatibility", () => {
  it("returns tier and requirement arrays", () => {
    const profile = {
      name: "Test",
      titles: ["Senior Frontend Engineer"],
      keywordsRequired: [],
      keywordsPreferred: [],
      keywordsExcluded: [],
      excludedCompanies: [],
      excludedTitles: [],
      industries: [],
      includeUnknownSalary: true,
      minimumMatchScore: 75,
      remotePreference: "remote_us_only",
      remotePreferences: ["remote_us_only"],
      relocationPreference: "unknown",
      countries: ["United States"],
      cities: [],
      salaryMin: null,
    } as unknown as JobSearchProfile;

    const score = scoreJobForProfile(
      { company: "Co", title: "Senior Frontend Engineer", location: "Remote US", remoteType: "remote", description: "React" },
      profile,
    );
    expect(score).toHaveProperty("tier");
    expect(score).toHaveProperty("failedRequirements");
    expect(score).toHaveProperty("passedRequirements");
  });
});
