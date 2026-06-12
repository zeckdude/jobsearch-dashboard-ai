import type { JobSearchProfile } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { extractRolePhrase, titleCareScore, TITLE_CARE_FETCH_THRESHOLD } from "@/lib/job-search/title-care";

const frontendProfile = {
  titles: ["Senior Frontend Engineer", "Staff Frontend Engineer", "Senior Full Stack Engineer"],
  keywordsRequired: [],
  keywordsPreferred: ["React", "TypeScript"],
  keywordsExcluded: [],
  excludedTitles: [],
  excludedCompanies: [],
} as unknown as JobSearchProfile;

describe("titleCareScore", () => {
  it("extracts role phrases from aggregator-style search titles", () => {
    expect(extractRolePhrase("Canva is looking for a Senior Frontend Engineer")).toBe("Senior Frontend Engineer");
    expect(extractRolePhrase("CircleIn hiring Senior Frontend Engineer in United States")).toContain("Senior Frontend Engineer");
  });

  it("scores noisy search titles above the fetch threshold", () => {
    const score = titleCareScore("Canva is looking for a Senior Frontend Engineer", [frontendProfile]);
    expect(score).toBeGreaterThanOrEqual(TITLE_CARE_FETCH_THRESHOLD);
  });

  it("scores direct ATS-style titles highly", () => {
    const score = titleCareScore("Senior Frontend Engineer - Remote", [frontendProfile]);
    expect(score).toBeGreaterThanOrEqual(TITLE_CARE_FETCH_THRESHOLD);
  });

  it("rejects clearly non-target titles", () => {
    const score = titleCareScore("Account Executive - SaaS", [frontendProfile]);
    expect(score).toBe(0);
  });

  it("uses adjacent family matching for related UI titles", () => {
    const score = titleCareScore("Staff UI Software Engineer", [frontendProfile]);
    expect(score).toBeGreaterThanOrEqual(TITLE_CARE_FETCH_THRESHOLD);
  });
});
