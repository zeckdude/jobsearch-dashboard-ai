import type { JobSource } from "@prisma/client";
import { activeCompanySources, normalizeCompanySourceConfig } from "@/lib/job-search/company-source-config";
import { isCompanySourceEnabled } from "@/lib/job-search/company-sources";
import { searchQueryTemplates } from "@/lib/job-search/source-catalog";

export type SourceBreakdownItem = {
  label: string;
  meta?: string;
  defaultNote?: string;
  includedThisRun: boolean;
};

export type SourceRunBreakdown = {
  items: SourceBreakdownItem[];
  totalConfigured: number;
  includedThisRun: number;
  footer?: string;
};

export function sourceRunBreakdown(source: Pick<JobSource, "type" | "name" | "config" | "baseUrl" | "enabled">): SourceRunBreakdown | null {
  const config = objectConfig(source.config);

  if (source.type === "company_site") {
    const normalized = normalizeCompanySourceConfig(source.config);
    const activeCount = activeCompanySources(normalized.companies).length;
    const eligible = normalized.companies
      .filter((company) => isCompanySourceEnabled(company) && company.priority <= normalized.priorityMax)
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
    const probed = eligible.slice(0, normalized.maxCompanies);
    const probedNames = new Set(probed.map((company) => company.name));

    return {
      totalConfigured: normalized.companies.length,
      includedThisRun: probed.length,
      footer: `${activeCount} active companies · priority ≤ ${normalized.priorityMax} includes ${eligible.length} · each run probes up to ${normalized.maxCompanies}. Pause or remove companies on the Sources page.`,
      items: normalized.companies
        .slice()
        .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
        .map((company) => {
          const includedThisRun = probedNames.has(company.name);
          return {
            label: company.name,
            meta: `P${company.priority}${company.categories.length ? ` · ${company.categories.slice(0, 2).join(", ")}` : ""}`,
            defaultNote: includedThisRun
              ? "included by default"
              : companyDefaultSkipNote(company, normalized, eligible.length),
            includedThisRun,
          };
        }),
    };
  }

  if (source.type === "greenhouse" || source.type === "lever" || source.type === "ashby") {
    const slugs = readStringArray(config.companySlugs);
    const maxCompanies = readNumber(config.maxCompanies, 40);
    const probed = slugs.slice(0, maxCompanies);
    const probedSet = new Set(probed);

    return {
      totalConfigured: slugs.length,
      includedThisRun: probed.length,
      footer: `Direct ${source.type} API fetch for up to ${maxCompanies} company boards per run.`,
      items: slugs.map((slug) => ({
        label: slug,
        meta: source.type,
        includedThisRun: probedSet.has(slug),
      })),
    };
  }

  if (source.type === "search_query") {
    const queries = readStringArray(config.queries);
    const list = queries.length ? queries : searchQueryTemplates;
    const maxFetch = readNumber(config.maxFetch, 80);

    return {
      totalConfigured: list.length,
      includedThisRun: list.length,
      footer: `Brave Search runs every query; max ${maxFetch} combined results per run.`,
      items: list.map((query) => ({
        label: query,
        includedThisRun: true,
      })),
    };
  }

  if (source.type === "jobfront") {
    const boardUrl = typeof config.boardUrl === "string" ? config.boardUrl : source.baseUrl ?? source.name;
    return {
      totalConfigured: 1,
      includedThisRun: 1,
      items: [{ label: boardUrl, meta: "JobFront board", includedThisRun: true }],
    };
  }

  if (source.type === "eightfold") {
    const careersUrl = typeof config.careersUrl === "string" ? config.careersUrl : source.baseUrl ?? source.name;
    const terms = readStringArray(config.queryTerms);
    return {
      totalConfigured: 1,
      includedThisRun: 1,
      footer: terms.length ? `Query terms: ${terms.slice(0, 6).join(", ")}${terms.length > 6 ? "…" : ""}` : undefined,
      items: [{ label: careersUrl, meta: "Eightfold careers", includedThisRun: true }],
    };
  }

  if (source.type === "remoteok" || source.type === "weworkremotely") {
    const config = objectConfig(source.config);
    const reason = typeof config.reason === "string" ? config.reason : "lower precision and apply friction";
    return {
      totalConfigured: 1,
      includedThisRun: source.enabled ? 1 : 0,
      footer: source.enabled
        ? "Included in search runs."
        : "Off by default in Sources. Check this connector in search options to include it for one run only.",
      items: [{
        label: source.baseUrl ?? source.name,
        meta: source.type === "remoteok" ? "Remote job board API" : "Remote job board RSS feeds",
        defaultNote: source.enabled ? "included by default" : `off by default (${reason})`,
        includedThisRun: source.enabled,
      }],
    };
  }

  return null;
}

function objectConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function companyDefaultSkipNote(
  company: { name: string; priority: number; enabled?: boolean },
  normalized: { priorityMax: number; maxCompanies: number },
  eligibleCount: number,
) {
  if (!isCompanySourceEnabled(company)) return "paused on Sources page";
  if (company.priority > normalized.priorityMax) {
    return `priority above ceiling (P${normalized.priorityMax})`;
  }
  return `beyond per-run limit (${normalized.maxCompanies} of ${eligibleCount} eligible)`;
}
