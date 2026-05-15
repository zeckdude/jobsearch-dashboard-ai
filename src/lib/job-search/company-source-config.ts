import type { Prisma } from "@prisma/client";
import { companySourceDownrankTerms, companySources, companySourceSearchTags, type CompanySource } from "@/lib/job-search/company-sources";

export type CompanySourceConfig = {
  qualityTier: string;
  description: string;
  companies: CompanySource[];
  searchTags: string[];
  downrankTerms: string[];
  priorityMax: number;
  maxCompanies: number;
  maxJobsPerCompany: number;
  maxFetch: number;
};

export function defaultCompanySourceConfig(): CompanySourceConfig {
  return {
    qualityTier: "company_source_list",
    description: "Curated company list for direct careers/ATS feed probing, not a live hiring assertion.",
    companies: companySources,
    searchTags: companySourceSearchTags,
    downrankTerms: companySourceDownrankTerms,
    priorityMax: 2,
    maxCompanies: 90,
    maxJobsPerCompany: 12,
    maxFetch: 900,
  };
}

export function normalizeCompanySourceConfig(value: unknown): CompanySourceConfig {
  const fallback = defaultCompanySourceConfig();
  const input = objectValue(value);
  const companies = Array.isArray(input.companies) ? input.companies.filter(isCompanySource) : fallback.companies;
  return {
    qualityTier: stringValue(input.qualityTier, fallback.qualityTier),
    description: stringValue(input.description, fallback.description),
    companies,
    searchTags: stringArray(input.searchTags, fallback.searchTags),
    downrankTerms: stringArray(input.downrankTerms, fallback.downrankTerms),
    priorityMax: clampInt(input.priorityMax, 1, 3, fallback.priorityMax),
    maxCompanies: clampInt(input.maxCompanies, 1, 500, fallback.maxCompanies),
    maxJobsPerCompany: clampInt(input.maxJobsPerCompany, 1, 50, fallback.maxJobsPerCompany),
    maxFetch: clampInt(input.maxFetch, 10, 3000, fallback.maxFetch),
  };
}

export function configToPrismaJson(config: CompanySourceConfig): Prisma.InputJsonValue {
  return config as unknown as Prisma.InputJsonValue;
}

function isCompanySource(value: unknown): value is CompanySource {
  const source = objectValue(value);
  return typeof source.name === "string"
    && Array.isArray(source.categories)
    && source.categories.every((item) => typeof item === "string")
    && (source.priority === 1 || source.priority === 2 || source.priority === 3)
    && Array.isArray(source.searchTerms)
    && source.searchTerms.every((item) => typeof item === "string")
    && typeof source.careersQuery === "string";
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
