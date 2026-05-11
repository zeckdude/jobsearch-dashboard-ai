import type { JobSearchProfile, JobSource } from "@prisma/client";
import type { JobSourceAdapter, NormalizedJobPosting, RawJobPosting } from "@/lib/job-search/source-adapter";

type RssItem = {
  title: string;
  link: string;
  guid?: string;
  description: string;
};

const defaultFeeds = [
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-product-jobs.rss",
];

export const weWorkRemotelyAdapter: JobSourceAdapter = {
  name: "We Work Remotely",
  async fetchJobs(_: JobSearchProfile, source: JobSource) {
    const feeds = readStringArray(source.config, "feeds");
    const urls = feeds.length ? feeds : defaultFeeds;
    const maxFetch = readNumber(source.config, "maxFetch", 120);
    const results: RawJobPosting[] = [];

    for (const url of urls) {
      const response = await fetch(url, {
        headers: { Accept: "application/rss+xml,text/xml", "User-Agent": "JobSearchOS/1.0" },
        next: { revalidate: 0 },
      });
      if (!response.ok) continue;
      const xml = await response.text();
      for (const item of parseRssItems(xml)) {
        const parsed = parseTitle(item.title);
        results.push({
          sourceJobId: item.guid ?? item.link,
          company: parsed.company,
          title: parsed.title,
          location: "Remote",
          description: stripHtml(item.description),
          applicationUrl: item.link,
          rawData: { ...item, feed: url },
        });
      }
    }

    return dedupeByUrl(results).slice(0, maxFetch);
  },
  async normalize(raw: RawJobPosting): Promise<NormalizedJobPosting> {
    return {
      sourceJobId: raw.sourceJobId,
      company: raw.company,
      title: raw.title,
      location: raw.location ?? "Remote",
      remoteType: "remote",
      description: raw.description,
      requirements: [],
      niceToHaves: [],
      benefits: [],
      applicationUrl: raw.applicationUrl,
      atsProvider: "other",
      rawData: raw.rawData ?? raw,
    };
  },
};

function parseRssItems(xml: string): RssItem[] {
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return itemMatches.map((item) => ({
    title: decodeXml(readTag(item, "title")),
    link: decodeXml(readTag(item, "link")),
    guid: decodeXml(readTag(item, "guid")),
    description: decodeXml(readTag(item, "description")),
  })).filter((item) => item.title && item.link);
}

function readTag(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return (match?.[1] ?? "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function parseTitle(value: string) {
  const parts = value.split(":").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { company: parts[0], title: parts.slice(1).join(": ") };
  return { company: "We Work Remotely", title: value };
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function readStringArray(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const found = (value as Record<string, unknown>)[key];
  return Array.isArray(found) ? found.filter((item): item is string => typeof item === "string") : [];
}

function readNumber(value: unknown, key: string, fallback: number) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const found = (value as Record<string, unknown>)[key];
  return typeof found === "number" ? found : fallback;
}

function dedupeByUrl(jobs: RawJobPosting[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = job.applicationUrl ?? `${job.company}-${job.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
