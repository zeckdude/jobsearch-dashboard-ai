import { describe, expect, it } from "vitest";
import {
  applyCompanySourceRunSettings,
  companySourceRunSettingsEqual,
  normalizeCompanySourceRunSettings,
} from "@/lib/job-search/company-source-run-settings";

const companySiteSource = {
  id: "src_company",
  name: "Company watchlist",
  type: "company_site" as const,
  baseUrl: null,
  enabled: true,
  config: {
    priorityMax: 2,
    maxCompanies: 90,
    maxJobsPerCompany: 12,
    maxFetch: 900,
    companies: [],
  },
};

describe("company source run settings", () => {
  it("applies per-run overrides onto the company source config", () => {
    const next = applyCompanySourceRunSettings(companySiteSource, {
      priorityMax: 3,
      maxCompanies: 120,
      maxJobsPerCompany: 20,
      maxFetch: 1500,
    });
    expect(next.config).toMatchObject({
      priorityMax: 3,
      maxCompanies: 120,
      maxJobsPerCompany: 20,
      maxFetch: 1500,
    });
  });

  it("detects when run settings differ from defaults", () => {
    const defaults = { priorityMax: 2, maxCompanies: 90, maxJobsPerCompany: 12, maxFetch: 900 };
    expect(companySourceRunSettingsEqual(defaults, { ...defaults })).toBe(true);
    expect(companySourceRunSettingsEqual(defaults, { ...defaults, maxCompanies: 100 })).toBe(false);
  });

  it("clamps invalid values while normalizing", () => {
    const normalized = normalizeCompanySourceRunSettings({
      priorityMax: 9,
      maxCompanies: 0,
      maxJobsPerCompany: 100,
      maxFetch: 1,
    });
    expect(normalized.priorityMax).toBe(3);
    expect(normalized.maxCompanies).toBe(1);
    expect(normalized.maxJobsPerCompany).toBe(50);
    expect(normalized.maxFetch).toBe(10);
  });
});
