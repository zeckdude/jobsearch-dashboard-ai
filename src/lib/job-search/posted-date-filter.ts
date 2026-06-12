import { extractListedAt } from "@/lib/job-search/listed-at";
import type { RawJobPosting } from "@/lib/job-search/source-adapter";

export type PostedDateFilterOptions = {
  maxPostedAgeDays: number | null;
  postedAfter?: Date | null;
  postedBefore?: Date | null;
  includeUnknownPostedDates: boolean;
};

export const defaultPostedDateFilter: PostedDateFilterOptions = {
  maxPostedAgeDays: 14,
  postedAfter: null,
  postedBefore: null,
  includeUnknownPostedDates: true,
};

export function applyPostedDateFilter(
  jobs: RawJobPosting[],
  options: PostedDateFilterOptions,
  now = new Date(),
): { kept: RawJobPosting[]; skipped: number } {
  const kept: RawJobPosting[] = [];
  let skipped = 0;

  for (const job of jobs) {
    if (passesPostedDateFilter(job, options, now)) {
      kept.push(job);
    } else {
      skipped += 1;
    }
  }

  return { kept, skipped };
}

export function passesPostedDateFilter(
  job: RawJobPosting,
  options: PostedDateFilterOptions,
  now = new Date(),
): boolean {
  const listedAt = extractListedAt(job.rawData);

  if (!listedAt) {
    return options.includeUnknownPostedDates;
  }

  if (options.postedAfter && listedAt < startOfDay(options.postedAfter)) {
    return false;
  }

  if (options.postedBefore && listedAt > endOfDay(options.postedBefore)) {
    return false;
  }

  const hasCustomRange = Boolean(options.postedAfter || options.postedBefore);
  if (!hasCustomRange && options.maxPostedAgeDays != null && options.maxPostedAgeDays >= 0) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - options.maxPostedAgeDays);
    if (listedAt < cutoff) return false;
  }

  return true;
}

export function usesCustomPostedDateRange(options: Pick<PostedDateFilterOptions, "postedAfter" | "postedBefore">) {
  return Boolean(options.postedAfter || options.postedBefore);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function postedDateFilterSummary(options: PostedDateFilterOptions): string {
  if (usesCustomPostedDateRange(options)) {
    return formatPostedDateRangeLabel(options.postedAfter ?? null, options.postedBefore ?? null);
  }
  if (options.maxPostedAgeDays != null) {
    return `Last ${options.maxPostedAgeDays} days`;
  }
  return "Any posting date";
}

export function formatPostedDateRangeLabel(postedAfter: Date | null, postedBefore: Date | null) {
  if (postedAfter && postedBefore) {
    return `${formatShortDate(postedAfter)} – ${formatShortDate(postedBefore)}`;
  }
  if (postedAfter) return `Posted on or after ${formatShortDate(postedAfter)}`;
  if (postedBefore) return `Posted on or before ${formatShortDate(postedBefore)}`;
  return "Custom date range";
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
