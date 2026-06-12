import type { JobSearchProfile } from "@prisma/client";
import { shouldIncludeInFetched, TITLE_CARE_FETCH_THRESHOLD } from "@/lib/job-search/title-care";
import type { RawJobPosting } from "@/lib/job-search/source-adapter";
import { checkJobApplicationUrl } from "@/lib/job-search/url-health";

const urlCheckBatchSize = 5;

export type FilterFetchedJobsResult = {
  kept: RawJobPosting[];
  titleFiltered: number;
  deadSkipped: number;
  urlChecked: number;
};

export async function filterJobsBeforeFetchedRecording(
  jobs: RawJobPosting[],
  sourceType: string,
  profiles: JobSearchProfile[],
): Promise<FilterFetchedJobsResult> {
  if (sourceType !== "search_query" || !profiles.length) {
    return { kept: jobs, titleFiltered: 0, deadSkipped: 0, urlChecked: 0 };
  }

  const worthy: RawJobPosting[] = [];
  let titleFiltered = 0;

  for (const job of jobs) {
    if (shouldIncludeInFetched(job.title, profiles)) {
      worthy.push(job);
    } else {
      titleFiltered += 1;
    }
  }

  const kept: RawJobPosting[] = [];
  let deadSkipped = 0;
  let urlChecked = 0;

  for (let index = 0; index < worthy.length; index += urlCheckBatchSize) {
    const batch = worthy.slice(index, index + urlCheckBatchSize);
    const results = await Promise.all(batch.map(async (job) => {
      if (!job.applicationUrl) return { job, keep: true };
      urlChecked += 1;
      const { status } = await checkJobApplicationUrl(job.applicationUrl);
      return { job, keep: status !== "dead" && status !== "closed" };
    }));

    for (const result of results) {
      if (result.keep) kept.push(result.job);
      else deadSkipped += 1;
    }
  }

  return { kept, titleFiltered, deadSkipped, urlChecked };
}

export function fetchedFilterSummary(result: FilterFetchedJobsResult, sourceType: string) {
  if (sourceType !== "search_query") return "";
  const parts = [
    `${result.titleFiltered} skipped (title score below ${TITLE_CARE_FETCH_THRESHOLD})`,
    result.urlChecked ? `${result.urlChecked} URL-checked` : null,
    result.deadSkipped ? `${result.deadSkipped} dead/closed listings removed` : null,
  ].filter(Boolean);
  return parts.length ? ` ${parts.join(", ")}.` : "";
}
