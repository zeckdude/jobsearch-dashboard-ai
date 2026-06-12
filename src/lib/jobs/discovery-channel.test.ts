import { describe, expect, it } from "vitest";
import {
  describeDiscoveryChannel,
  discoveryDescriptionForMatch,
  listSearchQueryCatalogCoverage,
  parseDiscoveryMetadata,
  platformFromSearchQuery,
  postingLinkTooltip,
  postingSiteLabel,
  resolveMatchedPlatform,
  searchQueryCoverageCount,
} from "@/lib/jobs/discovery-channel";

describe("discovery channel copy", () => {
  it("explains Web search in plain language", () => {
    const info = describeDiscoveryChannel({ name: "Web search", type: "search_query" });
    expect(info?.headline).toBe("Found through web search");
    expect(info?.description).toContain("web search");
    expect(info?.channelName).toBe("Web search");
  });

  it("explains Company watchlist in plain language", () => {
    const info = describeDiscoveryChannel({ name: "Company watchlist", type: "company_site" });
    expect(info?.headline).toBe("Found on your company watchlist");
    expect(info?.description).toContain("Sources watchlist");
  });
});

describe("search query platform resolution", () => {
  it("maps a site-scoped query to a catalog platform", () => {
    expect(platformFromSearchQuery('site:remote.co "Frontend Engineer" "React"')).toBe("Remote.co");
    expect(platformFromSearchQuery('site:builtin.com/jobs "Senior Frontend Engineer"')).toBe("Built In");
  });

  it("resolves the matched platform from stored discovery metadata", () => {
    const matched = resolveMatchedPlatform({
      applicationUrl: "https://remote.co/remote-jobs/senior-frontend-engineer-123/",
      discoveryMetadata: { query: 'site:remote.co "Frontend Engineer" "React" "TypeScript"' },
    });
    expect(matched.platform).toBe("Remote.co");
    expect(matched.confidence).toBe("exact");
  });

  it("falls back to the posting host when no query is stored", () => {
    const matched = resolveMatchedPlatform({
      applicationUrl: "https://boards.greenhouse.io/airbnb/jobs/123",
      discoveryMetadata: {},
    });
    expect(matched.platform).toBe("Greenhouse");
    expect(matched.confidence).toBe("inferred");
  });

  it("lists every active search-query catalog platform", () => {
    expect(searchQueryCoverageCount()).toBeGreaterThan(20);
    const coverage = listSearchQueryCatalogCoverage();
    const names = coverage.flatMap((group) => group.platforms);
    expect(names).toContain("Remote.co");
    expect(names).toContain("Workday");
    expect(names).toContain("Wellfound");
  });

  it("uses the matched platform in search-query copy", () => {
    const description = discoveryDescriptionForMatch(
      { name: "Web search", type: "search_query" },
      { platform: "Remote.co", query: 'site:remote.co "Frontend Engineer"', confidence: "exact" },
    );
    expect(description).toContain("Remote.co");
  });

  it("mentions Brave search query instead of saved query template when inferred", () => {
    const description = discoveryDescriptionForMatch(
      { name: "Web search", type: "search_query" },
      { platform: "Greenhouse", query: null, confidence: "inferred" },
    );
    expect(description).toContain("Brave search query");
    expect(description).not.toContain("saved query template");
  });
});

describe("discovery metadata parsing", () => {
  it("reads profileId from stored discovery metadata", () => {
    const metadata = parseDiscoveryMetadata({
      profileId: "profile_123",
      profileName: "Senior Frontend",
      sourceName: "Search Query Backlog",
      query: 'site:remote.co "Frontend Engineer"',
    });
    expect(metadata?.profileId).toBe("profile_123");
    expect(metadata?.profileName).toBe("Senior Frontend");
  });
});

describe("posting link labels", () => {
  it("names Greenhouse postings from the listing URL", () => {
    expect(postingSiteLabel("https://boards.greenhouse.io/airbnb/jobs/123")).toBe("Greenhouse");
    expect(postingLinkTooltip("https://boards.greenhouse.io/airbnb/jobs/123")).toBe("Open on Greenhouse");
  });

  it("falls back when the host is unknown", () => {
    expect(postingLinkTooltip("https://example-careers.example.com/jobs/123")).toBe("Open original listing");
  });
});
