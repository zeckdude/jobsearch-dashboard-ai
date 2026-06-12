import type { JobSearchProfile, JobSource } from "@prisma/client";
import {
  defaultPostedDateFilter,
  type PostedDateFilterOptions,
} from "@/lib/job-search/posted-date-filter";
import {
  defaultCompanySourceRunSettings,
  normalizeCompanySourceRunSettings,
  parseCompanySourceRunSettingsInput,
  type CompanySourceRunSettings,
} from "@/lib/job-search/company-source-run-settings";
import type { SourceItemSelections } from "@/lib/job-search/source-item-selection";
import { prisma } from "@/lib/prisma";

// re-export for API consumers
export { defaultPostedDateFilter };

export type SearchRunOptionsInput = {
  sourceIds?: string[];
  profileIds?: string[];
  postedDate?: Partial<PostedDateFilterOptions>;
  sourceItemSelections?: SourceItemSelections;
  companySourceRun?: Partial<CompanySourceRunSettings>;
};

export type ResolvedSearchRunOptions = {
  sourceIds: string[];
  profileIds: string[];
  postedDate: PostedDateFilterOptions;
  sourceItemSelections: SourceItemSelections;
  companySourceRun: CompanySourceRunSettings | null;
};

export type JobSearchPreferencesData = {
  maxPostedAgeDays: number | null;
  postedAfter: Date | null;
  postedBefore: Date | null;
  includeUnknownPostedDates: boolean;
  defaultSourceIds: string[];
  defaultProfileIds: string[];
};

export const hardcodedSearchPreferencesDefaults: JobSearchPreferencesData = {
  maxPostedAgeDays: 14,
  postedAfter: null,
  postedBefore: null,
  includeUnknownPostedDates: true,
  defaultSourceIds: [],
  defaultProfileIds: [],
};

export function preferencesToRunOptions(preferences: JobSearchPreferencesData): ResolvedSearchRunOptions {
  return {
    sourceIds: preferences.defaultSourceIds,
    profileIds: preferences.defaultProfileIds,
    postedDate: {
      maxPostedAgeDays: preferences.maxPostedAgeDays,
      postedAfter: preferences.postedAfter,
      postedBefore: preferences.postedBefore,
      includeUnknownPostedDates: preferences.includeUnknownPostedDates,
    },
    sourceItemSelections: {},
    companySourceRun: null,
  };
}

export function resolveRunOptions(
  preferences: JobSearchPreferencesData,
  overrides?: SearchRunOptionsInput | null,
  companySourceDefaults?: CompanySourceRunSettings,
): ResolvedSearchRunOptions {
  const base = preferencesToRunOptions(preferences);
  const runDefaults = companySourceDefaults ?? defaultCompanySourceRunSettings();
  if (!overrides) return base;

  return {
    sourceIds: overrides.sourceIds ?? base.sourceIds,
    profileIds: overrides.profileIds ?? base.profileIds,
    postedDate: {
      maxPostedAgeDays: overrides.postedDate?.maxPostedAgeDays ?? base.postedDate.maxPostedAgeDays,
      postedAfter: overrides.postedDate?.postedAfter !== undefined
        ? overrides.postedDate.postedAfter
        : base.postedDate.postedAfter,
      postedBefore: overrides.postedDate?.postedBefore !== undefined
        ? overrides.postedDate.postedBefore
        : base.postedDate.postedBefore,
      includeUnknownPostedDates: overrides.postedDate?.includeUnknownPostedDates
        ?? base.postedDate.includeUnknownPostedDates,
    },
    sourceItemSelections: overrides.sourceItemSelections ?? base.sourceItemSelections,
    companySourceRun: overrides.companySourceRun !== undefined
      ? normalizeCompanySourceRunSettings(overrides.companySourceRun, runDefaults)
      : base.companySourceRun,
  };
}

export async function loadJobSearchPreferences(userId?: string | null): Promise<JobSearchPreferencesData> {
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });

  if (!user) return hardcodedSearchPreferencesDefaults;

  const prefs = await prisma.jobSearchPreferences.findUnique({ where: { userId: user.id } });
  if (!prefs) return hardcodedSearchPreferencesDefaults;

  return {
    maxPostedAgeDays: prefs.maxPostedAgeDays,
    postedAfter: prefs.postedAfter,
    postedBefore: prefs.postedBefore,
    includeUnknownPostedDates: prefs.includeUnknownPostedDates,
    defaultSourceIds: parseStringArray(prefs.defaultSourceIds),
    defaultProfileIds: parseStringArray(prefs.defaultProfileIds),
  };
}

export async function resolveRunSources(
  sourceIds: string[],
): Promise<JobSource[]> {
  const all = await prisma.jobSource.findMany({
    where: { NOT: { type: "manual" } },
  });

  if (!sourceIds.length) {
    return all.filter((source) => source.enabled);
  }

  const allowed = new Set(sourceIds);
  return all.filter((source) => allowed.has(source.id));
}

export async function resolveRunProfiles(
  profileIds: string[],
  triggeredBy: "manual" | "cron",
): Promise<JobSearchProfile[]> {
  const profiles = await prisma.jobSearchProfile.findMany({
    where: {
      enabled: true,
      ...(triggeredBy === "cron" ? { scheduleEnabled: true } : {}),
    },
  });

  if (!profileIds.length) return profiles;

  const allowed = new Set(profileIds);
  return profiles.filter((profile) => allowed.has(profile.id));
}

export function parseSearchRunOptionsBody(body: unknown): SearchRunOptionsInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const record = body as Record<string, unknown>;

  const postedDateRaw = record.postedDate;
  let postedDate: SearchRunOptionsInput["postedDate"];
  if (postedDateRaw && typeof postedDateRaw === "object" && !Array.isArray(postedDateRaw)) {
    const pd = postedDateRaw as Record<string, unknown>;
    postedDate = {
      maxPostedAgeDays: pd.maxPostedAgeDays === null
        ? null
        : typeof pd.maxPostedAgeDays === "number" && Number.isFinite(pd.maxPostedAgeDays)
          ? Math.max(0, Math.round(pd.maxPostedAgeDays))
          : undefined,
      postedAfter: parseOptionalDate(pd.postedAfter),
      postedBefore: parseOptionalDate(pd.postedBefore),
      includeUnknownPostedDates: typeof pd.includeUnknownPostedDates === "boolean"
        ? pd.includeUnknownPostedDates
        : undefined,
    };
  }

  return {
    sourceIds: parseOptionalStringArray(record.sourceIds),
    profileIds: parseOptionalStringArray(record.profileIds),
    postedDate,
    sourceItemSelections: parseSourceItemSelections(record.sourceItemSelections),
    companySourceRun: parseCompanySourceRunSettingsInput(record.companySourceRun),
  };
}

export function serializeRunOptions(options: ResolvedSearchRunOptions) {
  return {
    sourceIds: options.sourceIds,
    profileIds: options.profileIds,
    postedDate: {
      maxPostedAgeDays: options.postedDate.maxPostedAgeDays,
      postedAfter: options.postedDate.postedAfter?.toISOString() ?? null,
      postedBefore: options.postedDate.postedBefore?.toISOString() ?? null,
      includeUnknownPostedDates: options.postedDate.includeUnknownPostedDates,
    },
    sourceItemSelections: options.sourceItemSelections,
    companySourceRun: options.companySourceRun,
  };
}

export function parseStoredRunOptions(value: unknown): ResolvedSearchRunOptions | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const postedRaw = record.postedDate;
  if (!postedRaw || typeof postedRaw !== "object" || Array.isArray(postedRaw)) return null;
  const posted = postedRaw as Record<string, unknown>;

  return {
    sourceIds: parseStringArray(record.sourceIds),
    profileIds: parseStringArray(record.profileIds),
    sourceItemSelections: parseSourceItemSelections(record.sourceItemSelections) ?? {},
    companySourceRun: record.companySourceRun && typeof record.companySourceRun === "object" && !Array.isArray(record.companySourceRun)
      ? normalizeCompanySourceRunSettings(record.companySourceRun as Partial<CompanySourceRunSettings>)
      : null,
    postedDate: normalizePostedDateFilter({
      maxPostedAgeDays: posted.maxPostedAgeDays === null
        ? null
        : typeof posted.maxPostedAgeDays === "number"
          ? posted.maxPostedAgeDays
          : defaultPostedDateFilter.maxPostedAgeDays,
      postedAfter: parseOptionalDate(posted.postedAfter) ?? null,
      postedBefore: parseOptionalDate(posted.postedBefore) ?? null,
      includeUnknownPostedDates: typeof posted.includeUnknownPostedDates === "boolean"
        ? posted.includeUnknownPostedDates
        : defaultPostedDateFilter.includeUnknownPostedDates,
    }),
  };
}

export function normalizePostedDateFilter(input: Partial<PostedDateFilterOptions>): PostedDateFilterOptions {
  return {
    maxPostedAgeDays: input.maxPostedAgeDays === null
      ? null
      : typeof input.maxPostedAgeDays === "number" && Number.isFinite(input.maxPostedAgeDays)
        ? Math.max(0, Math.round(input.maxPostedAgeDays))
        : defaultPostedDateFilter.maxPostedAgeDays,
    postedAfter: input.postedAfter ?? null,
    postedBefore: input.postedBefore ?? null,
    includeUnknownPostedDates: input.includeUnknownPostedDates ?? defaultPostedDateFilter.includeUnknownPostedDates,
  };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function parseOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  return parseStringArray(value);
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseSourceItemSelections(value: unknown): SourceItemSelections | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const selections: SourceItemSelections = {};
  for (const [sourceId, keys] of Object.entries(record)) {
    if (!sourceId || !Array.isArray(keys)) continue;
    selections[sourceId] = keys.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return selections;
}
