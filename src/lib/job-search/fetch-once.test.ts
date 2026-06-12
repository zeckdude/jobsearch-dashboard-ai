import type { JobSearchProfile, JobSource, JobSourceType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  canonicalRawJobKey,
  dedupeRawJobs,
  fetchSourceJobsOnce,
  jobCandidatesForProfile,
  recordFetchedSourceJobs,
  resolveFetchProfile,
} from "@/lib/job-search/fetch-once";
import type { RawJobPosting } from "@/lib/job-search/source-adapter";

vi.mock("@/lib/job-search/adapters", () => ({
  getAdapterForSource: vi.fn(),
}));

vi.mock("@/lib/job-search/run-items", () => ({
  fetchedRunItem: vi.fn((raw, sourceName) => ({ stage: "fetched", raw, sourceName })),
  queueFetchedSearchRunItems: vi.fn(),
}));

import { getAdapterForSource } from "@/lib/job-search/adapters";
import { queueFetchedSearchRunItems } from "@/lib/job-search/run-items";

const getAdapterMock = vi.mocked(getAdapterForSource);
const queueFetchedMock = vi.mocked(queueFetchedSearchRunItems);

function profile(input: Partial<JobSearchProfile> = {}): JobSearchProfile {
  return {
    id: "profile_1",
    userId: "user_1",
    name: "Frontend",
    maxResultsPerRun: 10,
    titles: ["Senior Frontend Engineer"],
    keywordsPreferred: ["React"],
    ...input,
  } as JobSearchProfile;
}

function source(type: JobSourceType = "greenhouse"): JobSource {
  return {
    id: "source_1",
    name: "Greenhouse",
    type,
    baseUrl: "https://example.com",
    enabled: true,
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as JobSource;
}

function rawJob(input: Partial<RawJobPosting> = {}): RawJobPosting {
  return {
    company: "Acme",
    title: "Senior Frontend Engineer",
    location: "Remote",
    description: "React TypeScript",
    applicationUrl: "https://example.com/jobs/1",
    ...input,
  };
}

describe("canonicalRawJobKey", () => {
  it("prefers applicationUrl over sourceJobId and fallback", () => {
    const job = rawJob({ applicationUrl: "https://a.com/1", sourceJobId: "gh:1" });
    expect(canonicalRawJobKey(job)).toBe("url:https://a.com/1");
  });

  it("uses sourceJobId when applicationUrl is missing", () => {
    const job = rawJob({ applicationUrl: undefined, sourceJobId: "gh:42" });
    expect(canonicalRawJobKey(job)).toBe("id:gh:42");
  });

  it("falls back to company|title|location", () => {
    const job = rawJob({ applicationUrl: undefined, sourceJobId: undefined, location: "NYC" });
    expect(canonicalRawJobKey(job)).toBe("fallback:Acme|Senior Frontend Engineer|NYC");
  });
});

describe("dedupeRawJobs", () => {
  it("collapses duplicate URLs", () => {
    const jobs = [
      rawJob({ applicationUrl: "https://example.com/jobs/1", title: "First" }),
      rawJob({ applicationUrl: "https://example.com/jobs/1", title: "Duplicate" }),
      rawJob({ applicationUrl: "https://example.com/jobs/2" }),
    ];
    const unique = dedupeRawJobs(jobs);
    expect(unique).toHaveLength(2);
    expect(unique[0]?.title).toBe("First");
  });
});

describe("resolveFetchProfile", () => {
  it("returns the first profile for sources that ignore fetch limits", () => {
    const profiles = [
      profile({ id: "a", maxResultsPerRun: 5 }),
      profile({ id: "b", maxResultsPerRun: 50 }),
    ];
    expect(resolveFetchProfile(profiles, "greenhouse").id).toBe("a");
  });

  it("picks the profile with the highest maxResultsPerRun for limit-based sources", () => {
    const profiles = [
      profile({ id: "a", maxResultsPerRun: 5 }),
      profile({ id: "b", maxResultsPerRun: 50 }),
      profile({ id: "c", maxResultsPerRun: 20 }),
    ];
    expect(resolveFetchProfile(profiles, "remoteok").id).toBe("b");
    expect(resolveFetchProfile(profiles, "eightfold").id).toBe("b");
    expect(resolveFetchProfile(profiles, "jobfront").id).toBe("b");
  });
});

describe("fetchSourceJobsOnce", () => {
  it("fetches once per source and dedupes raw jobs", async () => {
    const fetchJobs = vi.fn().mockResolvedValue([
      rawJob({ applicationUrl: "https://example.com/jobs/1" }),
      rawJob({ applicationUrl: "https://example.com/jobs/1" }),
      rawJob({ applicationUrl: "https://example.com/jobs/2" }),
    ]);
    getAdapterMock.mockReturnValue({ name: "Test", fetchJobs, normalize: vi.fn() });

    const profiles = [
      profile({ id: "a", maxResultsPerRun: 10 }),
      profile({ id: "b", maxResultsPerRun: 10 }),
    ];
    const unique = await fetchSourceJobsOnce(source(), profiles, async (promise) => promise, 1000);

    expect(fetchJobs).toHaveBeenCalledTimes(1);
    expect(fetchJobs).toHaveBeenCalledWith(profiles[0], expect.objectContaining({ id: "source_1" }));
    expect(unique).toHaveLength(2);
  });
});

describe("recordFetchedSourceJobs", () => {
  it("records unique fetched jobs without profile and increments stats once", () => {
    let fetched = 0;
    const jobs = [
      rawJob({ applicationUrl: "https://example.com/jobs/1" }),
      rawJob({ applicationUrl: "https://example.com/jobs/2" }),
    ];

    recordFetchedSourceJobs("run_1", { name: "Greenhouse", type: "greenhouse" }, jobs, (count) => {
      fetched += count;
    });

    expect(fetched).toBe(2);
    expect(queueFetchedMock).toHaveBeenCalledWith("run_1", expect.arrayContaining([
      expect.objectContaining({ stage: "fetched", sourceName: "Greenhouse" }),
    ]));
  });
});

describe("jobCandidatesForProfile", () => {
  it("returns all candidates for non-company sources", () => {
    const jobs = [rawJob(), rawJob({ applicationUrl: "https://example.com/jobs/2" })];
    expect(jobCandidatesForProfile("greenhouse", jobs, profile())).toEqual(jobs);
  });
});
