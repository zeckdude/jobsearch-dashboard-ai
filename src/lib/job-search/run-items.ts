import type { JobSearchRunItemStage, Prisma } from "@prisma/client";
import { extractListedAt } from "@/lib/job-search/listed-at";
import { formatRunItemSourceLabel } from "@/lib/job-search/source-display";
import { prisma } from "@/lib/prisma";

export type RunItemSortColumn = "title" | "company" | "location" | "profileName" | "sourceName" | "listedAt" | "overallScore";
export type RunItemSortDirection = "asc" | "desc";

const pendingFetchedWrites = new Map<string, Promise<void>>();

export type SearchRunItemInput = {
  stage: JobSearchRunItemStage;
  title: string;
  company: string;
  location?: string | null;
  applicationUrl?: string | null;
  sourceName?: string | null;
  profileId?: string | null;
  profileName?: string | null;
  overallScore?: number | null;
  matchTier?: string | null;
  jobPostingId?: string | null;
  listedAt?: Date | null;
};

const batchSize = 500;

export function searchRunStagePath(
  runId: string,
  stage: JobSearchRunItemStage,
  options?: { page?: number; q?: string; sort?: RunItemSortColumn; dir?: RunItemSortDirection },
) {
  const params = new URLSearchParams({ stage });
  if (options?.page && options.page > 1) params.set("page", String(options.page));
  if (options?.q?.trim()) params.set("q", options.q.trim());
  if (options?.sort) params.set("sort", options.sort);
  if (options?.dir) params.set("dir", options.dir);
  return `/runs/${runId}/jobs?${params.toString()}`;
}

export function normalizeRunItemSort(value: string | undefined, stage: JobSearchRunItemStage): RunItemSortColumn {
  if (
    value === "title"
    || value === "company"
    || value === "location"
    || value === "profileName"
    || value === "sourceName"
    || value === "listedAt"
    || value === "overallScore"
  ) {
    if (value === "overallScore" && stage === "fetched") return "listedAt";
    return value;
  }
  return stage === "fetched" ? "listedAt" : "overallScore";
}

export function normalizeRunItemSortDirection(value: string | undefined, sort: RunItemSortColumn, stage: JobSearchRunItemStage): RunItemSortDirection {
  if (value === "asc" || value === "desc") return value;
  if (sort === "listedAt") return "desc";
  if (sort === "overallScore") return "desc";
  if (sort === "title" || sort === "company" || sort === "location" || sort === "profileName" || sort === "sourceName") return "asc";
  return stage === "fetched" ? "desc" : "desc";
}

export function nextRunItemSortDirection(sort: RunItemSortColumn, dir: RunItemSortDirection): RunItemSortDirection {
  return dir === "asc" ? "desc" : "asc";
}

export function runItemOrderBy(
  sort: RunItemSortColumn,
  dir: RunItemSortDirection,
): Prisma.JobSearchRunItemOrderByWithRelationInput[] {
  const nulls = dir === "asc" ? "first" : "last";
  if (sort === "listedAt" || sort === "overallScore") {
    return [{ [sort]: { sort: dir, nulls } }, { title: "asc" }];
  }
  return [{ [sort]: dir }, { title: "asc" }];
}

export function normalizeRunItemSearchQuery(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "";
}

export function runItemSearchWhere(searchQuery: string): Prisma.JobSearchRunItemWhereInput {
  if (!searchQuery) return {};
  return {
    OR: [
      { company: { contains: searchQuery, mode: "insensitive" } },
      { title: { contains: searchQuery, mode: "insensitive" } },
      { location: { contains: searchQuery, mode: "insensitive" } },
      { sourceName: { contains: searchQuery, mode: "insensitive" } },
      { profileName: { contains: searchQuery, mode: "insensitive" } },
    ],
  };
}

export const searchRunStageLabels: Record<JobSearchRunItemStage, { title: string; description: string }> = {
  fetched: {
    title: "Fetched",
    description: "Every job posting pulled from sources during this search.",
  },
  new: {
    title: "New after dedupe",
    description: "Jobs that were new to your database after duplicate checking.",
  },
  matched: {
    title: "Matched",
    description: "Jobs that passed scoring and received a profile match during this search.",
  },
  saved: {
    title: "Saved",
    description: "New matches added to your jobs queue from this search.",
  },
};

export function normalizeSearchRunStage(value: string | undefined): JobSearchRunItemStage {
  if (value === "fetched" || value === "new" || value === "matched" || value === "saved") return value;
  return "fetched";
}

export async function recordSearchRunItems(runId: string, items: SearchRunItemInput[]) {
  if (items.length === 0) return;

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    await prisma.jobSearchRunItem.createMany({
      data: batch.map((item) => ({
        runId,
        stage: item.stage,
        title: item.title,
        company: item.company,
        location: item.location ?? null,
        applicationUrl: item.applicationUrl ?? null,
        sourceName: item.sourceName ?? null,
        profileId: item.profileId ?? null,
        profileName: item.profileName ?? null,
        overallScore: item.overallScore ?? null,
        matchTier: item.matchTier ?? null,
        jobPostingId: item.jobPostingId ?? null,
        listedAt: item.listedAt ?? null,
      })),
    });
  }
}

/** Queue fetched-job writes in the background so scoring is not blocked. */
export function queueFetchedSearchRunItems(runId: string, items: SearchRunItemInput[]) {
  const fetchedItems = items.filter((item) => item.stage === "fetched");
  if (fetchedItems.length === 0) return;

  const previous = pendingFetchedWrites.get(runId) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => recordSearchRunItems(runId, fetchedItems))
    .catch((error) => {
      console.error(`Failed to record fetched search run items for ${runId}`, error);
    });
  pendingFetchedWrites.set(runId, next);
}

export async function flushFetchedSearchRunItems(runId: string) {
  const pending = pendingFetchedWrites.get(runId);
  if (!pending) return;
  await pending;
  pendingFetchedWrites.delete(runId);
}

export function fetchedRunItem(
  raw: { title: string; company: string; location?: string; applicationUrl?: string; rawData?: unknown },
  sourceName: string,
  sourceType?: string,
  profile?: { id: string; name: string } | null,
): SearchRunItemInput {
  return {
    stage: "fetched",
    title: raw.title,
    company: raw.company,
    location: raw.location ?? null,
    applicationUrl: raw.applicationUrl ?? null,
    sourceName: sourceType ? formatRunItemSourceLabel(sourceName, sourceType, raw) : sourceName,
    profileId: profile?.id ?? null,
    profileName: profile?.name ?? null,
    listedAt: extractListedAt(raw.rawData),
  };
}

export function pipelineRunItem(
  stage: Exclude<JobSearchRunItemStage, "fetched">,
  job: {
    id: string;
    title: string;
    company: string;
    location?: string | null;
    applicationUrl?: string | null;
    firstSeenAt?: Date;
  },
  profile: { id: string; name: string },
  sourceName: string,
  evaluation?: { overallScore: number; tier: string },
  rawData?: unknown,
  sourceType?: string,
): SearchRunItemInput {
  const raw = {
    title: job.title,
    company: job.company,
    location: job.location ?? undefined,
    applicationUrl: job.applicationUrl ?? undefined,
    rawData,
  };
  return {
    stage,
    title: job.title,
    company: job.company,
    location: job.location,
    applicationUrl: job.applicationUrl,
    sourceName: sourceType ? formatRunItemSourceLabel(sourceName, sourceType, raw) : sourceName,
    profileId: profile.id,
    profileName: profile.name,
    overallScore: evaluation?.overallScore ?? null,
    matchTier: evaluation?.tier ?? null,
    jobPostingId: job.id,
    listedAt: extractListedAt(rawData, job.firstSeenAt ?? null),
  };
}
