import type { JobSource } from "@prisma/client";
import { normalizeCompanySourceConfig } from "@/lib/job-search/company-source-config";
import { searchQueryTemplates } from "@/lib/job-search/source-catalog";

export type SourceRunHint = {
  detail: string;
};

export function sourceRunHint(source: Pick<JobSource, "type" | "config" | "enabled">): SourceRunHint | null {
  const config = objectConfig(source.config);

  if (source.type === "company_site") {
    const normalized = normalizeCompanySourceConfig(source.config);
    const eligible = normalized.companies.filter((company) => company.priority <= normalized.priorityMax).length;
    return {
      detail: `${normalized.companies.length} companies in list · ${eligible} match priority ≤ ${normalized.priorityMax} · up to ${normalized.maxCompanies} probed per run`,
    };
  }

  if (source.type === "greenhouse" || source.type === "lever" || source.type === "ashby") {
    const slugs = readStringArray(config.companySlugs);
    const maxCompanies = readNumber(config.maxCompanies, 40);
    const maxFetch = readNumber(config.maxFetch, 500);
    const probed = Math.min(slugs.length, maxCompanies);
    return {
      detail: `${slugs.length} company slugs configured · up to ${probed} boards per run · max ${maxFetch} jobs`,
    };
  }

  if (source.type === "search_query") {
    const queries = readStringArray(config.queries);
    const queryCount = queries.length || searchQueryTemplates.length;
    const maxFetch = readNumber(config.maxFetch, 80);
    return {
      detail: `${queryCount} web search queries (Workday, Built In, Remotive, etc.) · max ${maxFetch} results`,
    };
  }

  if (source.type === "jobfront" || source.type === "eightfold") {
    const maxFetch = readNumber(config.maxFetch, 160);
    return { detail: `Niche careers board · max ${maxFetch} jobs per run` };
  }

  if (source.type === "remoteok" || source.type === "weworkremotely") {
    const config = objectConfig(source.config);
    const reason = typeof config.reason === "string" ? config.reason : "noise and apply friction";
    return {
      detail: source.enabled
        ? "Job board adapter · included in search runs"
        : `Job board adapter · off by default (${reason}) · enable for this run in search options`,
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
