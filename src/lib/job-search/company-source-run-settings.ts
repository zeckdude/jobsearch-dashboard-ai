import type { JobSource } from "@prisma/client";
import { normalizeCompanySourceConfig } from "@/lib/job-search/company-source-config";
import { CANONICAL_SOURCE_NAMES } from "@/lib/job-search/source-display";
import { prisma } from "@/lib/prisma";

export type CompanySourceRunSettings = {
  priorityMax: number;
  maxCompanies: number;
  maxJobsPerCompany: number;
  maxFetch: number;
};

export function defaultCompanySourceRunSettings(): CompanySourceRunSettings {
  const defaults = normalizeCompanySourceConfig(null);
  return {
    priorityMax: defaults.priorityMax,
    maxCompanies: defaults.maxCompanies,
    maxJobsPerCompany: defaults.maxJobsPerCompany,
    maxFetch: defaults.maxFetch,
  };
}

export function normalizeCompanySourceRunSettings(
  input: Partial<CompanySourceRunSettings> | null | undefined,
  fallback?: CompanySourceRunSettings,
): CompanySourceRunSettings {
  const base = fallback ?? defaultCompanySourceRunSettings();
  return {
    priorityMax: clampInt(input?.priorityMax, 1, 3, base.priorityMax),
    maxCompanies: clampInt(input?.maxCompanies, 1, 500, base.maxCompanies),
    maxJobsPerCompany: clampInt(input?.maxJobsPerCompany, 1, 50, base.maxJobsPerCompany),
    maxFetch: clampInt(input?.maxFetch, 10, 3000, base.maxFetch),
  };
}

export function readCompanySourceRunSettings(config: unknown): CompanySourceRunSettings {
  const normalized = normalizeCompanySourceConfig(config);
  return {
    priorityMax: normalized.priorityMax,
    maxCompanies: normalized.maxCompanies,
    maxJobsPerCompany: normalized.maxJobsPerCompany,
    maxFetch: normalized.maxFetch,
  };
}

export function parseCompanySourceRunSettingsInput(
  value: unknown,
): Partial<CompanySourceRunSettings> | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    priorityMax: typeof record.priorityMax === "number" ? record.priorityMax : undefined,
    maxCompanies: typeof record.maxCompanies === "number" ? record.maxCompanies : undefined,
    maxJobsPerCompany: typeof record.maxJobsPerCompany === "number" ? record.maxJobsPerCompany : undefined,
    maxFetch: typeof record.maxFetch === "number" ? record.maxFetch : undefined,
  };
}

export function companySourceRunSettingsEqual(
  left: CompanySourceRunSettings,
  right: CompanySourceRunSettings,
) {
  return left.priorityMax === right.priorityMax
    && left.maxCompanies === right.maxCompanies
    && left.maxJobsPerCompany === right.maxJobsPerCompany
    && left.maxFetch === right.maxFetch;
}

export async function loadCompanySourceRunDefaults(): Promise<CompanySourceRunSettings> {
  const source = await prisma.jobSource.findFirst({
    where: { type: "company_site", name: CANONICAL_SOURCE_NAMES.companySite },
    select: { config: true },
  });
  return source ? readCompanySourceRunSettings(source.config) : defaultCompanySourceRunSettings();
}

export function applyCompanySourceRunSettings(
  source: JobSource,
  settings: CompanySourceRunSettings | null | undefined,
): JobSource {
  if (source.type !== "company_site" || !settings) return source;
  const config = objectConfig(source.config);
  return {
    ...source,
    config: {
      ...config,
      priorityMax: settings.priorityMax,
      maxCompanies: settings.maxCompanies,
      maxJobsPerCompany: settings.maxJobsPerCompany,
      maxFetch: settings.maxFetch,
    },
  };
}

function objectConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
