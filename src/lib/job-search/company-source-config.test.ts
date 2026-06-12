import { describe, expect, it } from "vitest";
import {
  defaultCompanySourceConfig,
  removeCompanySource,
  setCompanySourceEnabled,
} from "@/lib/job-search/company-source-config";

describe("company source config mutations", () => {
  const config = defaultCompanySourceConfig();

  it("pauses and resumes an individual company", () => {
    const target = config.companies[0]?.name;
    expect(target).toBeTruthy();
    const paused = setCompanySourceEnabled(config, target!, false);
    expect(paused.companies.find((company) => company.name === target)?.enabled).toBe(false);
    const resumed = setCompanySourceEnabled(paused, target!, true);
    expect(resumed.companies.find((company) => company.name === target)?.enabled).toBe(true);
  });

  it("removes a company from the list", () => {
    const target = config.companies[0]?.name;
    expect(target).toBeTruthy();
    const next = removeCompanySource(config, target!);
    expect(next.companies.some((company) => company.name === target)).toBe(false);
  });
});
