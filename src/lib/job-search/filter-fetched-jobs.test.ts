import { describe, expect, it, vi } from "vitest";
import { filterJobsBeforeFetchedRecording } from "@/lib/job-search/filter-fetched-jobs";
import { checkJobApplicationUrl } from "@/lib/job-search/url-health";

vi.mock("@/lib/job-search/url-health", () => ({
  checkJobApplicationUrl: vi.fn(),
}));

const checkUrlMock = vi.mocked(checkJobApplicationUrl);

const frontendProfile = {
  titles: ["Senior Frontend Engineer"],
  keywordsRequired: [],
  keywordsPreferred: [],
  keywordsExcluded: [],
  excludedTitles: [],
  excludedCompanies: [],
} as Parameters<typeof filterJobsBeforeFetchedRecording>[2][number];

describe("filterJobsBeforeFetchedRecording", () => {
  it("passes non search_query sources through unchanged", async () => {
    const jobs = [{ title: "Anything", company: "Acme", description: "", applicationUrl: "https://example.com/job" }];
    const result = await filterJobsBeforeFetchedRecording(jobs, "greenhouse", [frontendProfile]);
    expect(result.kept).toEqual(jobs);
    expect(checkUrlMock).not.toHaveBeenCalled();
  });

  it("drops low-care search_query jobs and dead listings", async () => {
    checkUrlMock
      .mockResolvedValueOnce({ status: "closed" })
      .mockResolvedValueOnce({ status: "ok" });
    const result = await filterJobsBeforeFetchedRecording(
      [
        { title: "Account Executive", company: "SalesCo", description: "", applicationUrl: "https://example.com/sales" },
        { title: "Canva is looking for a Senior Frontend Engineer", company: "Himalayas", description: "", applicationUrl: "https://nodesk.co/dead" },
        { title: "Senior Frontend Engineer", company: "Acme", description: "", applicationUrl: "https://example.com/live" },
      ],
      "search_query",
      [frontendProfile],
    );

    expect(result.titleFiltered).toBe(1);
    expect(result.deadSkipped).toBe(1);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0]?.applicationUrl).toBe("https://example.com/live");
  });
});
