import type { JobSource } from "@prisma/client";
import { configToPrismaJson, normalizeCompanySourceConfig } from "@/lib/job-search/company-source-config";
import { sourceRunBreakdown, type SourceRunBreakdown } from "@/lib/job-search/source-run-breakdown";

export type SourceItemSelections = Record<string, string[]>;

export function sourceItemKey(label: string) {
  return label;
}

export function defaultIncludedItemKeys(breakdown: SourceRunBreakdown): string[] {
  return breakdown.items.filter((item) => item.includedThisRun).map((item) => sourceItemKey(item.label));
}

export function effectiveSourceItemKeys(
  sourceId: string,
  breakdown: SourceRunBreakdown,
  selections: SourceItemSelections,
): string[] {
  const custom = selections[sourceId];
  if (custom !== undefined) return custom;
  return defaultIncludedItemKeys(breakdown);
}

export function isSourceItemSelected(
  sourceId: string,
  itemKey: string,
  breakdown: SourceRunBreakdown,
  selections: SourceItemSelections,
): boolean {
  return effectiveSourceItemKeys(sourceId, breakdown, selections).includes(itemKey);
}

export function toggleSourceItemSelection(
  sourceId: string,
  itemKey: string,
  breakdown: SourceRunBreakdown,
  selections: SourceItemSelections,
): SourceItemSelections {
  const current = new Set(effectiveSourceItemKeys(sourceId, breakdown, selections));
  if (current.has(itemKey)) current.delete(itemKey);
  else current.add(itemKey);
  return { ...selections, [sourceId]: Array.from(current) };
}

export function applySourceItemSelection(source: JobSource, selectedKeys: string[] | undefined): JobSource {
  if (selectedKeys === undefined) return source;

  const selected = new Set(selectedKeys);
  const config = objectConfig(source.config);

  if (source.type === "company_site") {
    const normalized = normalizeCompanySourceConfig(source.config);
    const companies = normalized.companies.filter((company) => selected.has(company.name));
    return {
      ...source,
      config: configToPrismaJson({
        ...normalized,
        companies,
        priorityMax: 3,
        maxCompanies: Math.max(companies.length, 1),
      }),
    };
  }

  if (source.type === "greenhouse" || source.type === "lever" || source.type === "ashby") {
    const slugs = readStringArray(config.companySlugs).filter((slug) => selected.has(slug));
    return {
      ...source,
      config: {
        ...config,
        companySlugs: slugs,
        maxCompanies: Math.max(slugs.length, 1),
      },
    };
  }

  if (source.type === "search_query") {
    const queries = readStringArray(config.queries).filter((query) => selected.has(query));
    return {
      ...source,
      config: {
        ...config,
        queries,
      },
    };
  }

  if (source.type === "jobfront" || source.type === "eightfold") {
    const label = typeof config.boardUrl === "string"
      ? config.boardUrl
      : typeof config.careersUrl === "string"
        ? config.careersUrl
        : source.baseUrl ?? source.name;
    if (!selected.has(label)) {
      return { ...source, config: { ...config, maxFetch: 0 } };
    }
    return source;
  }

  return source;
}

export function breakdownWithSelection(
  source: Pick<JobSource, "id" | "type" | "name" | "config" | "baseUrl">,
  selections: SourceItemSelections,
): SourceRunBreakdown | null {
  const breakdown = sourceRunBreakdown(source);
  if (!breakdown) return null;

  const selectedKeys = new Set(effectiveSourceItemKeys(source.id, breakdown, selections));
  const items = breakdown.items.map((item) => ({
    ...item,
    includedThisRun: selectedKeys.has(sourceItemKey(item.label)),
  }));

  return {
    ...breakdown,
    items,
    includedThisRun: items.filter((item) => item.includedThisRun).length,
  };
}

function objectConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}
