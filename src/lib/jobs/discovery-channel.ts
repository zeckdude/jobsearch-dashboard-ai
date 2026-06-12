import { CANONICAL_SOURCE_NAMES, connectorDisplayName, LEGACY_SOURCE_NAMES } from "@/lib/job-search/source-display";
import { sourceCatalog, type SourceCatalogCategory } from "@/lib/job-search/source-catalog";

export type DiscoveryMetadata = {
  profileId?: string;
  profileName?: string;
  sourceName?: string;
  searchRunId?: string;
  query?: string;
  provider?: string;
};

export type DiscoveryChannelInfo = {
  channelName: string;
  headline: string;
  description: string;
};

export type MatchedPlatformInfo = {
  platform: string | null;
  query: string | null;
  confidence: "exact" | "inferred" | "unknown";
};

export type SearchQueryCoverageGroup = {
  category: SourceCatalogCategory;
  label: string;
  platforms: string[];
};

const channelByName: Record<string, Omit<DiscoveryChannelInfo, "channelName">> = {
  [CANONICAL_SOURCE_NAMES.searchQuery]: {
    headline: "Found through web search",
    description:
      "During your last search, the app ran targeted web searches across job boards and career sites that do not have a direct connector here. Expand the platform list below to see every platform this channel covers.",
  },
  [LEGACY_SOURCE_NAMES.searchQuery]: {
    headline: "Found through web search",
    description:
      "During your last search, the app ran targeted web searches across job boards and career sites that do not have a direct connector here. Expand the platform list below to see every platform this channel covers.",
  },
  [CANONICAL_SOURCE_NAMES.companySite]: {
    headline: "Found on your company watchlist",
    description:
      "This job came from a company on your Sources watchlist. The app checked that company's careers page or hiring system (often Greenhouse, Lever, or Ashby) and imported roles that fit your enabled search profiles.",
  },
  [LEGACY_SOURCE_NAMES.companySite]: {
    headline: "Found on your company watchlist",
    description:
      "This job came from a company on your Sources watchlist. The app checked that company's careers page or hiring system (often Greenhouse, Lever, or Ashby) and imported roles that fit your enabled search profiles.",
  },
  "Manual Paste": {
    headline: "You added this job",
    description:
      "This listing was pasted or entered by hand. It was not discovered automatically during a search run.",
  },
  Greenhouse: {
    headline: "Pulled from Greenhouse",
    description:
      "This job was imported directly from a company's Greenhouse job board during search. Greenhouse is a common hiring system many tech companies use to publish open roles.",
  },
  Lever: {
    headline: "Pulled from Lever",
    description:
      "This job was imported directly from a company's Lever job board during search. Lever is a hiring platform companies use to host and manage job listings.",
  },
  Ashby: {
    headline: "Pulled from Ashby",
    description:
      "This job was imported directly from a company's Ashby job board during search. Ashby is a hiring platform startups and growth companies often use for open roles.",
  },
};

const channelByType: Record<string, Omit<DiscoveryChannelInfo, "channelName">> = {
  search_query: {
    headline: "Found through web search",
    description:
      "This job was discovered by a web search connector during your last search run, rather than from a direct company or ATS feed.",
  },
  company_site: {
    headline: "Found on your company watchlist",
    description:
      "This job was discovered by checking companies on your Sources watchlist during search.",
  },
  greenhouse: {
    headline: "Pulled from Greenhouse",
    description:
      "This job was imported from a Greenhouse job board during search.",
  },
  lever: {
    headline: "Pulled from Lever",
    description:
      "This job was imported from a Lever job board during search.",
  },
  ashby: {
    headline: "Pulled from Ashby",
    description:
      "This job was imported from an Ashby job board during search.",
  },
  manual: {
    headline: "You added this job",
    description:
      "This listing was added manually and was not discovered automatically during search.",
  },
  jobfront: {
    headline: "Found on a niche job board",
    description:
      "This job was imported from a specialized JobFront-powered board you have configured in Sources.",
  },
  eightfold: {
    headline: "Found on a company careers site",
    description:
      "This job was imported from a company careers page using the Eightfold connector configured in Sources.",
  },
  remoteok: {
    headline: "Found on Remote OK",
    description:
      "This job was imported from the Remote OK job board during search.",
  },
  weworkremotely: {
    headline: "Found on We Work Remotely",
    description:
      "This job was imported from the We Work Remotely job board during search.",
  },
};

const postingSitePatterns: Array<{ test: (hostname: string) => boolean; label: string }> = [
  { test: (h) => h.includes("greenhouse"), label: "Greenhouse" },
  { test: (h) => h.includes("lever.co") || h.includes("jobs.lever"), label: "Lever" },
  { test: (h) => h.includes("ashby"), label: "Ashby" },
  { test: (h) => h.includes("workday"), label: "Workday" },
  { test: (h) => h.includes("smartrecruiters"), label: "SmartRecruiters" },
  { test: (h) => h.includes("workable"), label: "Workable" },
  { test: (h) => h.includes("icims"), label: "iCIMS" },
  { test: (h) => h.includes("jobvite"), label: "Jobvite" },
  { test: (h) => h.includes("bamboohr"), label: "BambooHR" },
  { test: (h) => h.includes("recruitee"), label: "Recruitee" },
  { test: (h) => h.includes("teamtailor"), label: "Teamtailor" },
  { test: (h) => h.includes("linkedin"), label: "LinkedIn" },
  { test: (h) => h.includes("indeed"), label: "Indeed" },
  { test: (h) => h.includes("wellfound") || h.includes("angellist"), label: "Wellfound" },
  { test: (h) => h.includes("builtin"), label: "Built In" },
  { test: (h) => h.includes("levels.fyi"), label: "Levels.fyi" },
  { test: (h) => h.includes("ycombinator") || h === "news.ycombinator.com", label: "Hacker News" },
  { test: (h) => h.includes("remotive"), label: "Remotive" },
  { test: (h) => h.includes("weworkremotely"), label: "We Work Remotely" },
  { test: (h) => h.includes("remote.co"), label: "Remote.co" },
  { test: (h) => h.includes("remoteok"), label: "Remote OK" },
  { test: (h) => h.includes("nodesk"), label: "NoDesk" },
  { test: (h) => h.includes("himalayas"), label: "Himalayas" },
  { test: (h) => h.includes("myworkdayjobs"), label: "Workday" },
];

export function describeDiscoveryChannel(
  source: { name: string; type: string } | null | undefined,
): DiscoveryChannelInfo | null {
  if (!source) return null;

  const named = channelByName[source.name];
  if (named) {
    return { channelName: connectorDisplayName(source.name, source.type), ...named };
  }

  const typed = channelByType[source.type];
  if (typed) {
    return { channelName: connectorDisplayName(source.name, source.type), ...typed };
  }

  return {
    channelName: connectorDisplayName(source.name, source.type),
    headline: "Discovered during search",
    description:
      "This job was imported automatically during a search run using the configured source connector.",
  };
}

export function postingSiteLabel(applicationUrl: string | null | undefined): string | null {
  if (!applicationUrl) return null;

  try {
    const hostname = new URL(applicationUrl).hostname.replace(/^www\./, "").toLowerCase();
    const matched = postingSitePatterns.find((entry) => entry.test(hostname));
    return matched?.label ?? null;
  } catch {
    return null;
  }
}

export function postingLinkTooltip(applicationUrl: string | null | undefined): string {
  const site = postingSiteLabel(applicationUrl);
  return site ? `Open on ${site}` : "Open original listing";
}

export function postingLinkLabel(applicationUrl: string | null | undefined): string {
  const site = postingSiteLabel(applicationUrl);
  return site ? `Open on ${site}` : "Open original listing";
}

const categoryLabels: Record<SourceCatalogCategory, string> = {
  general_job_board: "General job boards",
  remote_job_board: "Remote job boards",
  tech_job_board: "Tech job boards",
  startup_board: "Startup boards",
  ats_platform: "ATS & hiring systems",
  company_careers_page: "Company careers pages",
  vc_portfolio_jobs: "VC portfolio boards",
  government_defense: "Government & defense",
  recruiter_marketplace: "Recruiter marketplaces",
  freelance_marketplace: "Freelance marketplaces",
  community: "Communities",
  newsletter: "Newsletters",
  search_engine_query: "Broad search patterns",
  regional_board: "Regional boards",
  industry_niche_board: "Industry niche boards",
};

const queryHostnameLabels: Array<{ test: (host: string) => boolean; label: string }> = [
  { test: (h) => h.includes("ashby"), label: "Ashby" },
  { test: (h) => h.includes("greenhouse"), label: "Greenhouse" },
  { test: (h) => h.includes("lever.co") || h.includes("jobs.lever"), label: "Lever" },
  { test: (h) => h.includes("workday") || h.includes("myworkdayjobs"), label: "Workday" },
  { test: (h) => h.includes("smartrecruiters"), label: "SmartRecruiters" },
  { test: (h) => h.includes("icims"), label: "iCIMS" },
  { test: (h) => h.includes("jobvite"), label: "Jobvite" },
  { test: (h) => h.includes("bamboohr"), label: "BambooHR" },
  { test: (h) => h.includes("workable"), label: "Workable" },
  { test: (h) => h.includes("recruitee"), label: "Recruitee" },
  { test: (h) => h.includes("teamtailor"), label: "Teamtailor" },
  { test: (h) => h.includes("personio"), label: "Personio" },
  { test: (h) => h.includes("remote.co"), label: "Remote.co" },
  { test: (h) => h.includes("remotive"), label: "Remotive" },
  { test: (h) => h.includes("nodesk"), label: "NoDesk" },
  { test: (h) => h.includes("himalayas"), label: "Himalayas" },
  { test: (h) => h.includes("workingnomads"), label: "Working Nomads" },
  { test: (h) => h.includes("wellfound") || h.includes("angellist"), label: "Wellfound" },
  { test: (h) => h.includes("ycombinator.com/jobs"), label: "Y Combinator Work at a Startup" },
  { test: (h) => h.includes("builtin"), label: "Built In" },
  { test: (h) => h.includes("levels.fyi"), label: "Levels.fyi Jobs" },
  { test: (h) => h.includes("trueup"), label: "TrueUp" },
  { test: (h) => h.includes("dice.com"), label: "Dice" },
  { test: (h) => h === "news.ycombinator.com" || h.includes("news.ycombinator"), label: "Hacker News Who is Hiring" },
  { test: (h) => h.includes("jobs.a16z"), label: "a16z Portfolio Jobs" },
  { test: (h) => h.includes("jobs.sequoiacap"), label: "Sequoia Jobs" },
  { test: (h) => h.includes("jobs.generalcatalyst"), label: "General Catalyst Jobs" },
  { test: (h) => h.includes("jobs.greylock"), label: "Greylock Jobs" },
  { test: (h) => h.includes("jobs.indexventures"), label: "Index Ventures Jobs" },
  { test: (h) => h.includes("jobs.bvp"), label: "Bessemer Venture Partners Jobs" },
  { test: (h) => h.includes("usajobs.gov"), label: "USAJOBS" },
  { test: (h) => h.includes("explore.jobs.netflix"), label: "Netflix Careers" },
];

export function platformFromSearchQuery(query: string | null | undefined): string | null {
  if (!query) return null;
  const siteMatch = query.match(/site:([^\s"]+)/i);
  if (!siteMatch) return null;
  const host = siteMatch[1].replace(/^www\./, "").toLowerCase().split("/")[0];
  const matched = queryHostnameLabels.find((entry) => entry.test(host));
  return matched?.label ?? null;
}

export function resolveMatchedPlatform(input: {
  applicationUrl?: string | null;
  discoveryMetadata?: DiscoveryMetadata | null;
}): MatchedPlatformInfo {
  const query = input.discoveryMetadata?.query ?? null;
  const fromQuery = platformFromSearchQuery(query);
  if (fromQuery) {
    return { platform: fromQuery, query, confidence: "exact" };
  }

  const fromUrl = postingSiteLabel(input.applicationUrl);
  if (fromUrl) {
    return { platform: fromUrl, query, confidence: "inferred" };
  }

  return { platform: null, query, confidence: "unknown" };
}

export function listSearchQueryCatalogCoverage(): SearchQueryCoverageGroup[] {
  const grouped = new Map<SourceCatalogCategory, string[]>();

  for (const item of sourceCatalog) {
    if (item.connector !== "search_query" || item.status !== "active") continue;
    const existing = grouped.get(item.category) ?? [];
    grouped.set(item.category, [...existing, item.name]);
  }

  return Array.from(grouped.entries())
    .map(([category, platforms]) => ({
      category,
      label: categoryLabels[category],
      platforms: platforms.sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function searchQueryCoverageCount() {
  return listSearchQueryCatalogCoverage().reduce((total, group) => total + group.platforms.length, 0);
}

export function isSearchQueryDiscoverySource(source: { name: string; type: string } | null | undefined) {
  return source?.type === "search_query"
    || source?.name === LEGACY_SOURCE_NAMES.searchQuery
    || source?.name === CANONICAL_SOURCE_NAMES.searchQuery;
}

export function parseDiscoveryMetadata(value: unknown): DiscoveryMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const metadata: DiscoveryMetadata = {
    profileId: typeof record.profileId === "string" ? record.profileId : undefined,
    profileName: typeof record.profileName === "string" ? record.profileName : undefined,
    sourceName: typeof record.sourceName === "string" ? record.sourceName : undefined,
    searchRunId: typeof record.searchRunId === "string" ? record.searchRunId : undefined,
    query: typeof record.query === "string" ? record.query : undefined,
    provider: typeof record.provider === "string" ? record.provider : undefined,
  };
  return metadata.profileId || metadata.profileName || metadata.sourceName || metadata.searchRunId || metadata.query || metadata.provider ? metadata : null;
}

export function discoveryDescriptionForMatch(
  source: { name: string; type: string } | null | undefined,
  matched: MatchedPlatformInfo,
): string {
  const base = describeDiscoveryChannel(source);
  if (!base) return "";

  if (isSearchQueryDiscoverySource(source)) {
    if (matched.platform && matched.confidence === "exact") {
      return `This listing matched a targeted web search for ${matched.platform}. Web search runs Brave queries across dozens of boards and ATS sites that do not have a direct connector here.`;
    }
    if (matched.platform && matched.confidence === "inferred") {
      return `This listing was found through web search and the posting URL points to ${matched.platform}. We could not tie it to one matched Brave search query, but the live listing host is the best match signal.`;
    }
    return base.description;
  }

  return base.description;
}
