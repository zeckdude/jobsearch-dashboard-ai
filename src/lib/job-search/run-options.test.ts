import { describe, expect, it } from "vitest";
import {
  hardcodedSearchPreferencesDefaults,
  parseSearchRunOptionsBody,
  resolveRunOptions,
} from "@/lib/job-search/run-options";

describe("resolveRunOptions", () => {
  it("uses preferences baseline when run body is empty", () => {
    const resolved = resolveRunOptions({
      ...hardcodedSearchPreferencesDefaults,
      maxPostedAgeDays: 7,
      includeUnknownPostedDates: true,
    });
    expect(resolved.postedDate.maxPostedAgeDays).toBe(7);
    expect(resolved.postedDate.includeUnknownPostedDates).toBe(true);
  });

  it("lets run overrides replace preference defaults", () => {
    const resolved = resolveRunOptions(hardcodedSearchPreferencesDefaults, {
      postedDate: {
        maxPostedAgeDays: 30,
        includeUnknownPostedDates: false,
      },
    });
    expect(resolved.postedDate.maxPostedAgeDays).toBe(30);
    expect(resolved.postedDate.includeUnknownPostedDates).toBe(false);
  });

  it("parses POST body fields", () => {
    const parsed = parseSearchRunOptionsBody({
      sourceIds: ["src_1"],
      profileIds: ["profile_1"],
      postedDate: {
        maxPostedAgeDays: 14,
        includeUnknownPostedDates: true,
        postedAfter: null,
        postedBefore: null,
      },
    });
    expect(parsed.sourceIds).toEqual(["src_1"]);
    expect(parsed.profileIds).toEqual(["profile_1"]);
    expect(parsed.postedDate?.maxPostedAgeDays).toBe(14);
  });

  it("parses per-run company source run settings", () => {
    const resolved = resolveRunOptions(
      hardcodedSearchPreferencesDefaults,
      { companySourceRun: { maxCompanies: 120, maxFetch: 1200 } },
      { priorityMax: 2, maxCompanies: 90, maxJobsPerCompany: 12, maxFetch: 900 },
    );
    expect(resolved.companySourceRun).toEqual({
      priorityMax: 2,
      maxCompanies: 120,
      maxJobsPerCompany: 12,
      maxFetch: 1200,
    });
  });

  it("parses per-run source item selections", () => {
    const resolved = resolveRunOptions(hardcodedSearchPreferencesDefaults, {
      sourceItemSelections: {
        src_greenhouse: ["airbnb", "stripe"],
      },
    });
    expect(resolved.sourceItemSelections).toEqual({
      src_greenhouse: ["airbnb", "stripe"],
    });

    const parsed = parseSearchRunOptionsBody({
      sourceItemSelections: {
        src_greenhouse: ["anthropic"],
      },
    });
    expect(parsed.sourceItemSelections).toEqual({
      src_greenhouse: ["anthropic"],
    });
  });
});
