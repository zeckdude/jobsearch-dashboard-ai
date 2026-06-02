import type { JobSearchProfile, JobSource } from "@prisma/client";
import { searchQueryTemplates } from "@/lib/job-search/source-catalog";
import type { JobSourceAdapter, NormalizedJobPosting, RawJobPosting } from "@/lib/job-search/source-adapter";

type BraveSearchResult = {
  title?: string;
  url?: string;
  description?: string;
  profile?: { name?: string };
  meta_url?: { hostname?: string };
};

type BraveSearchResponse = {
  web?: {
    results?: BraveSearchResult[];
  };
};

const searchTimeoutMs = 10_000;

export const searchQueryAdapter: JobSourceAdapter = {
  name: "Search Query Backlog",
  async fetchJobs(profile: JobSearchProfile, source: JobSource) {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) return [];

    const queries = readStringArray(source.config, "queries", searchQueryTemplates);
    const maxResultsPerQuery = readNumber(source.config, "maxResultsPerQuery", 8);
    const maxFetch = readNumber(source.config, "maxFetch", Number(process.env.SEARCH_QUERY_MAX_RESULTS ?? 80));
    const results: RawJobPosting[] = [];

    for (const query of queries) {
      const payload = await fetchBraveResults(query, apiKey, maxResultsPerQuery);
      for (const result of payload) {
        if (!result.url || !result.title) continue;
        results.push({
          sourceJobId: `search:${stableId(result.url)}`,
          company: result.profile?.name ?? companyFromUrl(result.url),
          title: cleanTitle(result.title),
          location: locationFromQuery(query),
          description: [result.description, `Matched query: ${query}`, profile.name ? `Profile: ${profile.name}` : ""].filter(Boolean).join("\n\n"),
          applicationUrl: result.url,
          rawData: { provider: "brave", query, result },
        });
        if (results.length >= maxFetch) return dedupeByUrl(results);
      }
    }

    return dedupeByUrl(results).slice(0, maxFetch);
  },
  async normalize(raw: RawJobPosting): Promise<NormalizedJobPosting> {
    const haystack = `${raw.title} ${raw.location ?? ""} ${raw.description}`;
    return {
      sourceJobId: raw.sourceJobId,
      company: raw.company,
      title: raw.title,
      location: raw.location,
      remoteType: /remote/i.test(haystack) ? "remote" : /hybrid/i.test(haystack) ? "hybrid" : /on-?site/i.test(haystack) ? "onsite" : "unknown",
      description: raw.description,
      requirements: [],
      niceToHaves: [],
      benefits: [],
      applicationUrl: raw.applicationUrl,
      atsProvider: atsProviderFromUrl(raw.applicationUrl),
      rawData: raw.rawData ?? raw,
    };
  },
};

async function fetchBraveResults(query: string, apiKey: string, count: number) {
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(Math.min(20, Math.max(1, count))));
    url.searchParams.set("search_lang", "en");
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "JobSearchOS/1.0",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(searchTimeoutMs),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as BraveSearchResponse;
    return payload.web?.results ?? [];
  } catch {
    return [];
  }
}

function readStringArray(value: unknown, key: string, fallback: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const found = (value as Record<string, unknown>)[key];
  return Array.isArray(found) ? found.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : fallback;
}

function readNumber(value: unknown, key: string, fallback: number) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const found = (value as Record<string, unknown>)[key];
  return typeof found === "number" && Number.isFinite(found) ? Math.max(1, Math.round(found)) : fallback;
}

function stableId(value: string) {
  return Buffer.from(value).toString("base64url").slice(0, 80);
}

function cleanTitle(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function companyFromUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, "");
    return hostname.split(".")[0]?.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || hostname;
  } catch {
    return "Search result";
  }
}

function locationFromQuery(query: string) {
  if (/remote/i.test(query)) return "Remote";
  if (/united states| usa | us/i.test(query)) return "United States";
  return undefined;
}

function atsProviderFromUrl(value?: string): NormalizedJobPosting["atsProvider"] {
  if (!value) return "other";
  if (/greenhouse/i.test(value)) return "greenhouse";
  if (/lever/i.test(value)) return "lever";
  if (/ashby/i.test(value)) return "ashby";
  if (/workday/i.test(value)) return "workday";
  if (/smartrecruiters/i.test(value)) return "smartrecruiters";
  if (/workable/i.test(value)) return "workable";
  return "other";
}

function dedupeByUrl(jobs: RawJobPosting[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = job.applicationUrl ?? job.sourceJobId ?? `${job.company}:${job.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
