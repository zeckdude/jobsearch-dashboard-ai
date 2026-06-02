import type { JobSearchProfile, JobSource } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchQueryAdapter } from "@/lib/job-search/adapters/search-query";

describe("searchQueryAdapter", () => {
  beforeEach(() => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "brave_key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns no results when the Brave key is missing", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "");

    const jobs = await searchQueryAdapter.fetchJobs(profile(), source());

    expect(jobs).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches Brave web results and normalizes ATS provider metadata", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            {
              title: "Senior Frontend Engineer",
              url: "https://jobs.ashbyhq.com/example/123",
              description: "Remote React TypeScript role",
              profile: { name: "Example" },
            },
          ],
        },
      }),
    } as Response);

    const jobs = await searchQueryAdapter.fetchJobs(profile(), source({ queries: ['site:jobs.ashbyhq.com "Senior Frontend Engineer" "remote"'] }));
    const normalized = await searchQueryAdapter.normalize(jobs[0]!);

    expect(fetch).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({
      headers: expect.objectContaining({ "X-Subscription-Token": "brave_key" }),
    }));
    expect(jobs[0]).toMatchObject({
      company: "Example",
      title: "Senior Frontend Engineer",
      location: "Remote",
      applicationUrl: "https://jobs.ashbyhq.com/example/123",
    });
    expect(normalized).toMatchObject({
      remoteType: "remote",
      atsProvider: "ashby",
    });
  });
});

function profile(input: Partial<JobSearchProfile> = {}) {
  return {
    id: "profile_1",
    userId: "user_1",
    name: "Frontend",
    maxResultsPerRun: 10,
    ...input,
  } as JobSearchProfile;
}

function source(config: Record<string, unknown> = {}) {
  return {
    id: "source_1",
    name: "Search Query Backlog",
    type: "search_query",
    baseUrl: "https://search.brave.com",
    enabled: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    config: {
      queries: ['"Senior Frontend Engineer" "remote"'],
      maxResultsPerQuery: 5,
      maxFetch: 20,
      ...config,
    },
  } as JobSource;
}
