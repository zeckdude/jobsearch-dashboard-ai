import { describe, expect, it } from "vitest";
import { defaultCompanySourceConfig, normalizeCompanySourceConfig } from "@/lib/job-search/company-source-config";

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
});
