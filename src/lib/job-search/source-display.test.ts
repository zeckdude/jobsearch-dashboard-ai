import { describe, expect, it } from "vitest";
import {
  connectorDisplayName,
  formatRunItemSourceLabel,
  formatStoredJobSourceLabel,
  splitSourceLabel,
} from "@/lib/job-search/source-display";

describe("source display", () => {
  it("renames legacy connector labels", () => {
    expect(connectorDisplayName("Search Query Backlog", "search_query")).toBe("Web search");
    expect(connectorDisplayName("Company Source List", "company_site")).toBe("Company watchlist");
  });

  it("formats web search labels with the matched query", () => {
    const label = formatRunItemSourceLabel("Search Query Backlog", "search_query", {
      company: "Himalayas",
      applicationUrl: "https://himalayas.app/jobs/example",
      rawData: { query: 'site:himalayas.app "Frontend Engineer" "React" "remote"' },
    });
    expect(label).toContain("Web search · ");
    expect(label).toContain("himalayas.app");
  });

  it("formats company watchlist labels with the company name", () => {
    const label = formatRunItemSourceLabel("Company Source List", "company_site", {
      company: "LaunchDarkly",
      rawData: { provider: "greenhouse", slug: "launchdarkly" },
    });
    expect(label).toBe("Company watchlist · LaunchDarkly");
  });

  it("formats stored job labels from posting data", () => {
    expect(formatStoredJobSourceLabel(
      { name: "Web search", type: "search_query" },
      { company: "Acme", applicationUrl: "https://example.com", rawData: { query: 'site:example.com "Engineer"' } },
    )).toContain("Web search · ");
  });

  it("splits parent and resource for table rendering", () => {
    expect(splitSourceLabel("Web search · site:builtin.com \"Frontend Engineer\"")).toEqual({
      parent: "Web search",
      resource: "site:builtin.com \"Frontend Engineer\"",
    });
  });
});
