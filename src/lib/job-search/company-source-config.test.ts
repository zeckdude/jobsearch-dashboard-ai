import { describe, expect, it } from "vitest";
import { addCompanySourceToConfig, defaultCompanySourceConfig, normalizeCompanySourceConfig } from "@/lib/job-search/company-source-config";

describe("company source config", () => {
  it("normalizes missing config to curated defaults", () => {
    const config = normalizeCompanySourceConfig(null);
    expect(config.companies.length).toBe(defaultCompanySourceConfig().companies.length);
    expect(config.priorityMax).toBe(2);
    expect(config.maxCompanies).toBe(90);
  });

  it("clamps run limits and rejects malformed company entries", () => {
    const config = normalizeCompanySourceConfig({
      companies: [{ name: "Bad" }],
      priorityMax: 99,
      maxCompanies: -10,
      maxJobsPerCompany: 99,
      maxFetch: 1,
    });

    expect(config.companies).toHaveLength(0);
    expect(config.priorityMax).toBe(3);
    expect(config.maxCompanies).toBe(1);
    expect(config.maxJobsPerCompany).toBe(50);
    expect(config.maxFetch).toBe(10);
  });

  it("adds custom company sources with generated search defaults", () => {
    const config = normalizeCompanySourceConfig({ companies: [] });
    const next = addCompanySourceToConfig(config, {
      name: "Example AI",
      priority: 1,
      categories: ["ai", "developer-tools"],
      greenhouseSlugs: ["exampleai"],
    });

    expect(next.companies).toHaveLength(1);
    expect(next.companies[0]).toMatchObject({
      name: "Example AI",
      priority: 1,
      categories: ["ai", "developer-tools"],
      careersQuery: "Example AI careers senior frontend engineer React TypeScript",
      atsSlugs: { greenhouse: ["exampleai"] },
    });
    expect(next.companies[0]?.searchTerms).toEqual(expect.arrayContaining(["Senior Frontend Engineer", "AI Product Engineer", "Developer Tools"]));
  });

  it("rejects duplicate company sources by case-insensitive name", () => {
    const config = addCompanySourceToConfig(normalizeCompanySourceConfig({ companies: [] }), { name: "Linear", priority: 1 });

    expect(() => addCompanySourceToConfig(config, { name: "linear", priority: 2 })).toThrow("already in the company source list");
  });
});
