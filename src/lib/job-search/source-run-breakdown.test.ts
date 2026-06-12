import { describe, expect, it } from "vitest";
import { sourceRunBreakdown } from "@/lib/job-search/source-run-breakdown";

describe("sourceRunBreakdown", () => {
  it("lists company source entries with priority and run inclusion", () => {
    const breakdown = sourceRunBreakdown({
      type: "company_site",
      name: "Company watchlist",
      baseUrl: null,
      config: {
        companies: [
          { name: "Acme", categories: ["saas"], priority: 1, searchTerms: [], careersQuery: "" },
          { name: "Beta", categories: ["ai"], priority: 3, searchTerms: [], careersQuery: "" },
        ],
        priorityMax: 2,
        maxCompanies: 1,
        maxJobsPerCompany: 12,
        maxFetch: 100,
      },
    });

    expect(breakdown?.totalConfigured).toBe(2);
    expect(breakdown?.includedThisRun).toBe(1);
    expect(breakdown?.items.find((item) => item.label === "Acme")?.includedThisRun).toBe(true);
    expect(breakdown?.items.find((item) => item.label === "Beta")?.includedThisRun).toBe(false);
    expect(breakdown?.items.find((item) => item.label === "Acme")?.meta).toContain("P1");
  });

  it("explains why eligible companies are skipped when beyond the per-run cap", () => {
    const breakdown = sourceRunBreakdown({
      type: "company_site",
      name: "Company watchlist",
      baseUrl: null,
      config: {
        companies: [
          { name: "Alpha", categories: ["saas"], priority: 1, searchTerms: [], careersQuery: "" },
          { name: "Beta", categories: ["ai"], priority: 1, searchTerms: [], careersQuery: "" },
          { name: "Gamma", categories: ["ai"], priority: 1, searchTerms: [], careersQuery: "" },
        ],
        priorityMax: 2,
        maxCompanies: 2,
        maxJobsPerCompany: 12,
        maxFetch: 100,
      },
    });

    expect(breakdown?.includedThisRun).toBe(2);
    expect(breakdown?.items.find((item) => item.label === "Gamma")?.defaultNote).toContain("beyond per-run limit");
  });

  it("marks paused companies separately from per-run cap skips", () => {
    const breakdown = sourceRunBreakdown({
      type: "company_site",
      name: "Company watchlist",
      baseUrl: null,
      config: {
        companies: [
          { name: "ActiveCo", categories: ["saas"], priority: 1, searchTerms: [], careersQuery: "", enabled: true },
          { name: "PausedCo", categories: ["ai"], priority: 1, searchTerms: [], careersQuery: "", enabled: false },
        ],
        priorityMax: 2,
        maxCompanies: 90,
        maxJobsPerCompany: 12,
        maxFetch: 100,
      },
    });

    expect(breakdown?.items.find((item) => item.label === "PausedCo")?.defaultNote).toBe("paused on Sources page");
    expect(breakdown?.items.find((item) => item.label === "PausedCo")?.includedThisRun).toBe(false);
  });

  it("lists search query strings", () => {
    const breakdown = sourceRunBreakdown({
      type: "search_query",
      name: "Web search",
      baseUrl: null,
      config: {
        queries: ['site:example.com "Frontend Engineer"'],
        maxFetch: 80,
      },
    });

    expect(breakdown?.items).toHaveLength(1);
    expect(breakdown?.items[0]?.label).toContain("Frontend Engineer");
    expect(breakdown?.items[0]?.includedThisRun).toBe(true);
  });
});
