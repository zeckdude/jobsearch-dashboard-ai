import { describe, expect, it } from "vitest";
import { buildImportAllNewPatches, buildMergedResumeData } from "./import-commit";
import { profileHasContent } from "./profile-content";
import type { ParsedResume } from "./schemas";

const parsedFixture: ParsedResume = {
  contactInfo: { fullName: "Alex Rivera", email: "alex@example.com", phone: "555-0100" },
  professionalSummary: "Senior engineer.",
  skills: { coreSkills: ["React", "TypeScript"], technicalSkills: ["Node.js"], toolsFrameworksLibraries: [], programmingLanguages: [] },
  workExperience: [
    {
      company: "Acme",
      title: "Senior Engineer",
      startDate: "2021",
      endDate: "Present",
      isCurrent: true,
      skills: [],
      achievements: ["Led dashboard migration."],
    },
    {
      company: "Beta Corp",
      title: "Engineer",
      startDate: "2019",
      endDate: "2021",
      isCurrent: false,
      skills: [],
      achievements: ["Built APIs."],
    },
  ],
  experienceBullets: [
    {
      company: "Acme",
      role: "Senior Engineer",
      text: "Led dashboard migration.",
      category: "frontend",
      metrics: {},
      keywords: [],
      sourceText: "Led dashboard migration.",
      truthLevel: "verified",
    },
    {
      company: "Beta Corp",
      role: "Engineer",
      text: "Built APIs.",
      category: "fullstack",
      metrics: {},
      keywords: [],
      sourceText: "Built APIs.",
      truthLevel: "verified",
    },
  ],
  projects: [{ name: "Portfolio", description: "Personal site", technologies: ["Next.js"], highlights: [] }],
  education: ["State University — B.S. CS"],
  certifications: ["AWS Certified Developer"],
  additionalSections: [{ title: "AI Engineering", content: "Built RAG pipelines." }],
  inferredTags: [],
  fieldsNeedingReview: [],
  confidence: 0.9,
};

describe("profileHasContent", () => {
  it("returns false for an empty snapshot", () => {
    expect(
      profileHasContent({
        fullName: "Unknown",
        email: "alex@example.com",
        phone: null,
        location: null,
        linkedinUrl: null,
        githubUrl: null,
        portfolioUrl: null,
        professionalSummary: null,
        coreSkills: [],
        bullets: [],
        workExperiences: [],
        projects: [],
        education: [],
        certifications: [],
        additionalSections: [],
      }),
    ).toBe(false);
  });
});

describe("buildMergedResumeData", () => {
  const emptyCurrent = {
    profile: {
      fullName: "Unknown",
      email: "alex@example.com",
      phone: null,
      location: null,
      linkedinUrl: null,
      githubUrl: null,
      portfolioUrl: null,
      professionalSummary: null,
      masterSummary: "",
      coreSkills: [],
      technicalSkills: [],
      domainExpertise: [],
    },
    workExperience: [],
    experienceBullets: [],
    projects: [],
    education: [],
    certifications: [],
    additionalSections: [],
  };

  it("replaces all content in replace mode", () => {
    const merged = buildMergedResumeData(parsedFixture, emptyCurrent, "replace");
    expect(merged.workExperience).toHaveLength(2);
    expect(merged.education).toEqual(["State University — B.S. CS"]);
    expect(merged.profile.fullName).toBe("Alex Rivera");
  });

  it("imports only selected jobs in merge mode", () => {
    const current = {
      ...emptyCurrent,
      profile: { ...emptyCurrent.profile, fullName: "Chris", professionalSummary: "Existing summary." },
      workExperience: [
        {
          company: "Acme",
          title: "Senior Engineer",
          startDate: "2020",
          endDate: "Present",
          isCurrent: true,
          skills: [],
          achievements: ["Existing bullet."],
        },
      ],
      experienceBullets: [
        {
          company: "Acme",
          role: "Senior Engineer",
          text: "Existing bullet.",
          category: "frontend",
          metrics: {},
          keywords: [],
          sourceText: "Existing bullet.",
          truthLevel: "verified" as const,
        },
      ],
    };

    const merged = buildMergedResumeData(parsedFixture, current, "merge", {
      jobs: [{ importJobIndex: 1 }],
      education: [0],
    });

    expect(merged.workExperience).toHaveLength(2);
    expect(merged.workExperience[1]?.company).toBe("Beta Corp");
    expect(merged.education).toContain("State University — B.S. CS");
    expect(merged.profile.professionalSummary).toBe("Existing summary.");
  });
});

describe("buildImportAllNewPatches", () => {
  it("skips jobs and lines that already exist", () => {
    const current = {
      profile: {
        fullName: "Alex Rivera",
        email: "alex@example.com",
        phone: null,
        location: null,
        linkedinUrl: null,
        githubUrl: null,
        portfolioUrl: null,
        professionalSummary: "Senior engineer.",
        masterSummary: "Senior engineer.",
        coreSkills: ["React"],
        technicalSkills: ["Node.js"],
        domainExpertise: [],
      },
      workExperience: [parsedFixture.workExperience[0]],
      experienceBullets: [parsedFixture.experienceBullets[0]],
      projects: [],
      education: [],
      certifications: [],
      additionalSections: [],
    };

    const patches = buildImportAllNewPatches(parsedFixture, current);
    expect(patches.jobs?.some((job) => job.importJobIndex === 0)).toBe(false);
    expect(patches.jobs?.some((job) => job.importJobIndex === 1)).toBe(true);
    expect(patches.education).toEqual([0]);
  });
});
