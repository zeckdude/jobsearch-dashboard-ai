import type { JobSearchProfile, JobSource, JobSourceType } from "@prisma/client";
import { getAdapterForSource } from "@/lib/job-search/adapters";
import { filterCompanyJobsForProfile } from "@/lib/job-search/adapters/company-site";
import { fetchedRunItem, queueFetchedSearchRunItems } from "@/lib/job-search/run-items";
import type { RawJobPosting } from "@/lib/job-search/source-adapter";

/** Source types that use profile.maxResultsPerRun only to size fetch limits. */
const profileLimitSourceTypes = new Set<JobSourceType>(["remoteok", "eightfold", "jobfront"]);

export function canonicalRawJobKey(raw: RawJobPosting): string {
  if (raw.applicationUrl) return `url:${raw.applicationUrl}`;
  if (raw.sourceJobId) return `id:${raw.sourceJobId}`;
  return `fallback:${raw.company}|${raw.title}|${raw.location ?? ""}`;
}

export function dedupeRawJobs(jobs: RawJobPosting[]): RawJobPosting[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = canonicalRawJobKey(job);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveFetchProfile(profiles: JobSearchProfile[], sourceType: JobSourceType): JobSearchProfile {
  if (profiles.length === 0) {
    throw new Error("Cannot resolve fetch profile without enabled search profiles.");
  }
  if (!profileLimitSourceTypes.has(sourceType)) return profiles[0];
  return profiles.reduce((best, profile) => (
    profile.maxResultsPerRun > best.maxResultsPerRun ? profile : best
  ));
}

export function jobCandidatesForProfile(
  sourceType: JobSourceType,
  allCandidates: RawJobPosting[],
  profile: JobSearchProfile,
): RawJobPosting[] {
  if (sourceType === "company_site") {
    return filterCompanyJobsForProfile(allCandidates, profile);
  }
  return allCandidates;
}

export async function fetchSourceJobsOnce(
  source: JobSource,
  profiles: JobSearchProfile[],
  fetchWithTimeout: <T>(promise: Promise<T>, timeoutMs: number, message: string) => Promise<T>,
  timeoutMs: number,
): Promise<RawJobPosting[]> {
  const adapter = getAdapterForSource(source.type);
  if (!adapter) return [];

  const fetchProfile = resolveFetchProfile(profiles, source.type);
  const rawJobs = await fetchWithTimeout(
    adapter.fetchJobs(fetchProfile, source),
    timeoutMs,
    `${source.name} fetch timed out after ${Math.round(timeoutMs / 60_000)} minutes.`,
  );
  return dedupeRawJobs(rawJobs);
}

export function recordFetchedSourceJobs(
  runId: string,
  source: { name: string; type: string },
  uniqueJobs: RawJobPosting[],
  onFetched: (count: number) => void,
) {
  onFetched(uniqueJobs.length);
  queueFetchedSearchRunItems(
    runId,
    uniqueJobs.map((rawJob) => fetchedRunItem(rawJob, source.name, source.type)),
  );
}
