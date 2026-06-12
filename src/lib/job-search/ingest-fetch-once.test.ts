import type { JobSearchProfile, JobSource } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { filterCompanyJobsForProfile } from "@/lib/job-search/adapters/company-site";
import {
  dedupeRawJobs,
  fetchSourceJobsOnce,
  jobCandidatesForProfile,
  recordFetchedSourceJobs,
} from "@/lib/job-search/fetch-once";
import type { RawJobPosting } from "@/lib/job-search/source-adapter";

vi.mock("@/lib/job-search/adapters", () => ({
  getAdapterForSource: vi.fn(),
}));

vi.mock("@/lib/job-search/run-items", () => ({
  fetchedRunItem: vi.fn((raw, sourceName) => ({
    stage: "fetched",
    title: raw.title,
    company: raw.company,
    sourceName,
    profileId: null,
    profileName: null,
  })),
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

function source(): JobSource {
  return {
    id: "source_1",
    name: "Greenhouse",
    type: "greenhouse",
    baseUrl: "https://example.com",
    enabled: true,
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as JobSource;
}

function rawJob(url: string, title: string): RawJobPosting {
  return {
    company: "Acme",
    title,
    location: "Remote",
    description: "React TypeScript",
    applicationUrl: url,
  };
}

describe("ingest fetch-once path", () => {
  it("fetches once for two profiles and counts unique jobs, not profile multiples", async () => {
    const duplicateBoard = [
      rawJob("https://example.com/jobs/1", "Senior Frontend Engineer"),
      rawJob("https://example.com/jobs/1", "Senior Frontend Engineer"),
      rawJob("https://example.com/jobs/2", "Staff Frontend Engineer"),
      rawJob("https://example.com/jobs/3", "Full Stack Engineer"),
    ];
    const fetchJobs = vi.fn().mockResolvedValue(duplicateBoard);
    getAdapterMock.mockReturnValue({ name: "Test", fetchJobs, normalize: vi.fn() });

    const profiles = [
      profile({ id: "a", name: "Profile A" }),
      profile({ id: "b", name: "Profile B" }),
    ];

    const uniqueRawJobs = await fetchSourceJobsOnce(source(), profiles, async (promise) => promise, 1000);
    expect(fetchJobs).toHaveBeenCalledTimes(1);

    let jobsFetched = 0;
    recordFetchedSourceJobs("run_1", "Greenhouse", uniqueRawJobs, (count) => {
      jobsFetched += count;
    });

    expect(uniqueRawJobs).toHaveLength(3);
    expect(jobsFetched).toBe(3);
    expect(jobsFetched).not.toBe(duplicateBoard.length * profiles.length);
    expect(queueFetchedMock).toHaveBeenCalledTimes(1);
    expect(queueFetchedMock.mock.calls[0]?.[1]).toHaveLength(3);
    expect(queueFetchedMock.mock.calls[0]?.[1]?.every((item) => item.profileId === null)).toBe(true);

    const allCandidates = uniqueRawJobs;
    for (const searchProfile of profiles) {
      const candidates = jobCandidatesForProfile("greenhouse", allCandidates, searchProfile);
      expect(candidates).toHaveLength(3);
    }
  });

  it("applies company-site filtering per profile from one shared board", () => {
    const companyRaw = (title: string, description: string): RawJobPosting => ({
      company: "Acme",
      title,
      location: "Remote",
      description,
      applicationUrl: `https://example.com/${title.replace(/\s+/g, "-").toLowerCase()}`,
      rawData: {
        provider: "greenhouse",
        slug: "acme",
        companySource: true,
        categories: ["saas"],
        priority: 1,
        searchTerms: [],
        careersQuery: "acme",
      },
    });

    const board = dedupeRawJobs([
      companyRaw("Quantum Widget Engineer", "Build quantum widgets"),
      companyRaw("Senior Frontend Engineer", "React TypeScript frontend"),
    ]);

    const profileA = profile({
      id: "a",
      titles: ["Quantum Widget Engineer"],
      keywordsPreferred: [],
    });
    const profileB = profile({
      id: "b",
      name: "Frontend",
      titles: ["Senior Frontend Engineer"],
      keywordsPreferred: ["React"],
    });

    const forA = jobCandidatesForProfile("company_site", board, profileA);
    const forB = jobCandidatesForProfile("company_site", board, profileB);

    expect(forA.map((job) => job.title)).toEqual(["Quantum Widget Engineer", "Senior Frontend Engineer"]);
    expect(forB.map((job) => job.title)).toEqual(["Senior Frontend Engineer"]);
    expect(filterCompanyJobsForProfile(board, profileA)).toEqual(forA);
  });
});
