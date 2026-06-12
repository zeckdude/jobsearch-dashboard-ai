import type { JobSource } from "@prisma/client";

export const LEGACY_SOURCE_NAMES = {
  searchQuery: "Search Query Backlog",
  companySite: "Company Source List",
} as const;

export const CANONICAL_SOURCE_NAMES = {
  searchQuery: "Web search",
  companySite: "Company watchlist",
} as const;

const legacyDisplayNames: Record<string, string> = {
  [LEGACY_SOURCE_NAMES.searchQuery]: CANONICAL_SOURCE_NAMES.searchQuery,
  [LEGACY_SOURCE_NAMES.companySite]: CANONICAL_SOURCE_NAMES.companySite,
};

export function connectorDisplayName(name: string, type?: string | null) {
  if (legacyDisplayNames[name]) return legacyDisplayNames[name];
  if (type === "search_query") return CANONICAL_SOURCE_NAMES.searchQuery;
  if (type === "company_site" && name === LEGACY_SOURCE_NAMES.companySite) {
    return CANONICAL_SOURCE_NAMES.companySite;
  }
  return name;
}

export function canonicalSourceName(type: "search_query" | "company_site") {
  return type === "search_query"
    ? CANONICAL_SOURCE_NAMES.searchQuery
    : CANONICAL_SOURCE_NAMES.companySite;
}

export function resolveSourceResourceDetail(
  sourceType: string,
  raw: { company?: string; applicationUrl?: string; rawData?: unknown },
): string | null {
  const rawData = objectRecord(raw.rawData);

  if (sourceType === "search_query") {
    if (typeof rawData.query === "string" && rawData.query.trim()) {
      return shortenLabel(rawData.query.trim(), 72);
    }
    const host = hostnameFromUrl(raw.applicationUrl);
    if (host) return host;
    return null;
  }

  if (sourceType === "company_site") {
    if (raw.company?.trim()) return raw.company.trim();
    return null;
  }

  if (sourceType === "greenhouse" || sourceType === "lever" || sourceType === "ashby") {
    const slug = typeof rawData.slug === "string" ? rawData.slug : undefined;
    if (slug) return slug;
    if (raw.company?.trim()) return raw.company.trim();
  }

  if (raw.company?.trim()) return raw.company.trim();
  return hostnameFromUrl(raw.applicationUrl);
}

export function formatRunItemSourceLabel(
  connectorName: string,
  sourceType: string,
  raw: { company?: string; applicationUrl?: string; rawData?: unknown },
) {
  const parent = connectorDisplayName(connectorName, sourceType);
  const resource = resolveSourceResourceDetail(sourceType, raw);
  if (!resource || resource.toLowerCase() === parent.toLowerCase()) return parent;
  return `${parent} · ${resource}`;
}

export function splitSourceLabel(label: string | null | undefined) {
  if (!label) return { parent: "—", resource: null as string | null };
  const separator = label.indexOf(" · ");
  if (separator < 0) {
    return { parent: connectorDisplayName(label), resource: null };
  }
  const parent = connectorDisplayName(label.slice(0, separator));
  const resource = label.slice(separator + 3).trim() || null;
  return { parent, resource };
}

export function displayStoredSourceLabel(label: string | null | undefined) {
  return splitSourceLabel(label);
}

function hostnameFromUrl(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function shortenLabel(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function jobSourceLookupName(source: Pick<JobSource, "name" | "type">) {
  return source.name;
}

export function formatStoredJobSourceLabel(
  source: { name: string; type: string } | null | undefined,
  job: { company: string; applicationUrl?: string | null; rawData?: unknown },
) {
  if (!source) return "Manual";
  return formatRunItemSourceLabel(source.name, source.type, {
    company: job.company,
    applicationUrl: job.applicationUrl ?? undefined,
    rawData: job.rawData,
  });
}
