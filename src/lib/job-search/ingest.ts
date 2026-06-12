import { JobSearchProfile, JobSearchRun, JobSource, NotificationSettings, Prisma, User } from "@prisma/client";
import { runDuplicateStaleJobDetectorAgent } from "@/lib/agents/duplicate-stale-job-detector";
import { runRecruitingAgency } from "@/lib/applications/recruiting-agency";
import { runJobFitScoringAgent } from "@/lib/agents/job-fit-scorer";
import { createCanonicalJobKeys, createJobContentHash, hasSameCanonicalJob } from "@/lib/job-search/dedupe";
import { getAdapterForSource } from "@/lib/job-search/adapters";
import {
  fetchSourceJobsOnce,
  jobCandidatesForProfile,
  recordFetchedSourceJobs,
} from "@/lib/job-search/fetch-once";
import { classifyJobSearchTitle, evaluateJobAgainstProfile, type EvaluationResult } from "@/lib/job-search/scoring";
import { checkJobApplicationUrl, staleScoreForUrlHealth } from "@/lib/job-search/url-health";
import { isListingReviewPosting, type JobSourceAdapter, type NormalizedJobPosting, type RawJobPosting } from "@/lib/job-search/source-adapter";
import { isJobSuppressed, loadJobSuppressionStatesByUserIds } from "@/lib/jobs/suppression";
import { sendNotification } from "@/lib/notifications/send";
import { applyPostedDateFilter, postedDateFilterSummary } from "@/lib/job-search/posted-date-filter";
import {
  flushFetchedSearchRunItems,
  pipelineRunItem,
  recordSearchRunItems,
} from "@/lib/job-search/run-items";
import { applyCompanySourceRunSettings } from "@/lib/job-search/company-source-run-settings";
import { prepareBoardSourceForRun } from "@/lib/job-search/paused-board-source";
import { fetchedFilterSummary, filterJobsBeforeFetchedRecording } from "@/lib/job-search/filter-fetched-jobs";
import { applySourceItemSelection } from "@/lib/job-search/source-item-selection";
import {
  loadJobSearchPreferences,
  parseStoredRunOptions,
  preferencesToRunOptions,
  resolveRunProfiles,
  resolveRunSources,
  type ResolvedSearchRunOptions,
} from "@/lib/job-search/run-options";
import { prisma } from "@/lib/prisma";

type ProgressEvent = {
  at: string;
  message: string;
  stats?: JobSearchStats;
  agencyHandoff?: AgencyHandoffProgress;
};

type JobSearchStats = {
  jobsFetched: number;
  jobsAfterDedupe: number;
  jobsAfterFilters: number;
  jobsSaved: number;
  jobsScored?: number;
  jobsSuppressed?: number;
  listingPagesSuppressed?: number;
  jobsBelowThreshold?: number;
  jobsStaleSkipped?: number;
  jobsTitleFiltered?: number;
  jobsDeadSkipped?: number;
  jobsUrlChecked?: number;
  frontendTitles?: number;
  fullStackTitles?: number;
  staffPrincipalLeadTitles?: number;
  managementTitles?: number;
  backendDataPlatformTitles?: number;
  nonTargetTitles?: number;
  genericSoftwareTitles?: number;
};

type AgencyHandoffProgress = {
  status: "started" | "running" | "completed" | "failed" | "skipped";
  reason:
    | "started"
    | "search_not_successful"
    | "no_eligible_matches"
    | "agency_already_running"
    | "agency_failed";
  agentRunId?: string;
  result?: {
    approved: number;
    prepared: number;
    failed: number;
    skipped: number;
  };
  error?: string;
};

const sourceFetchTimeoutMs = 90 * 1000;

export async function runJobSearch(triggeredBy: "manual" | "cron" = "manual", runId?: string) {
  const user = await prisma.user.findFirst({
    include: {
      notificationSettings: true,
      profile: { include: { experienceBullets: { where: { truthLevel: "verified" } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  const preferences = await loadJobSearchPreferences(user?.id);
  const existingRun = runId
    ? await prisma.jobSearchRun.findUnique({ where: { id: runId } })
    : null;
  const runOptions: ResolvedSearchRunOptions = existingRun
    ? (parseStoredRunOptions(existingRun.runOptions) ?? preferencesToRunOptions(preferences))
    : preferencesToRunOptions(preferences);

  const profiles = await resolveRunProfiles(runOptions.profileIds, triggeredBy);
  const run = existingRun
    ? await prisma.jobSearchRun.update({
        where: { id: runId },
        data: {
          status: "running",
          triggeredBy,
          profileIds: profiles.map((profile) => profile.id),
          progress: [],
          errors: [],
        },
      })
    : await prisma.jobSearchRun.create({
        data: {
          status: "running",
          triggeredBy,
          profileIds: profiles.map((profile) => profile.id),
        },
      });
  const sources = (await resolveRunSources(runOptions.sourceIds))
    .sort((a, b) => sourcePriority(a.type) - sourcePriority(b.type));
  const stats = {
    jobsFetched: 0,
    jobsAfterDedupe: 0,
    jobsAfterFilters: 0,
    jobsSaved: 0,
    jobsScored: 0,
    jobsSuppressed: 0,
    listingPagesSuppressed: 0,
    jobsBelowThreshold: 0,
    jobsStaleSkipped: 0,
    jobsTitleFiltered: 0,
    jobsDeadSkipped: 0,
    jobsUrlChecked: 0,
    frontendTitles: 0,
    fullStackTitles: 0,
    staffPrincipalLeadTitles: 0,
    managementTitles: 0,
    backendDataPlatformTitles: 0,
    nonTargetTitles: 0,
    genericSoftwareTitles: 0,
  };
  const errors: Array<{ source: string; profile: string; message: string }> = [];
  const newMatches: Array<{ score: number; title: string; company: string; profile: string }> = [];
  const suppressionStateByUserId = await loadJobSuppressionStatesByUserIds(profiles.map((profile) => profile.userId));

  await appendProgress(
    run.id,
    `Starting job search across ${profiles.length} profile(s) and ${sources.length} source(s). Posting date: ${postedDateFilterSummary(runOptions.postedDate)}.`,
    stats,
  );

  async function isCancelled(): Promise<boolean> {
    const current = await prisma.jobSearchRun.findUnique({ where: { id: run.id }, select: { status: true } });
    return current?.status === "cancelled";
  }

  // jobsFetched counts unique raw jobs per source (deduped), not multiplied by profile count.
  for (const source of sources) {
    if (await isCancelled()) {
      await prisma.jobSearchRun.update({
        where: { id: run.id },
        data: {
          jobsFetched: stats.jobsFetched,
          jobsAfterDedupe: stats.jobsAfterDedupe,
          jobsAfterFilters: stats.jobsAfterFilters,
          jobsSaved: stats.jobsSaved,
        },
      });
      await flushFetchedSearchRunItems(run.id);
      await appendProgress(run.id, `Search cancelled. Saved ${stats.jobsSaved} matches before stopping.`, stats);
      return;
    }

    const adapter = getAdapterForSource(source.type);
    if (!adapter) continue;

    try {
      const fetchSource = prepareBoardSourceForRun(
        applySourceItemSelection(
          applyCompanySourceRunSettings(source, runOptions.companySourceRun),
          runOptions.sourceItemSelections[source.id],
        ),
        true,
      );
      const selectionCount = runOptions.sourceItemSelections[source.id]?.length;
      await appendProgress(
        run.id,
        selectionCount !== undefined
          ? `Fetching ${source.name} (${selectionCount} selected items).`
          : `Fetching ${source.name}.`,
        stats,
      );
      const uniqueRawJobs = await fetchSourceJobsOnce(fetchSource, profiles, withTimeout, sourceFetchTimeoutMs);

      const listingReviews = uniqueRawJobs.filter(isListingReviewPosting);
      if (listingReviews.length > 0) {
        stats.listingPagesSuppressed = (stats.listingPagesSuppressed ?? 0) + listingReviews.length;
        for (const listing of listingReviews.slice(0, 20)) {
          await appendProgress(run.id, listingReviewMessage(listing), stats);
        }
      }

      const beforeDateFilter = uniqueRawJobs.filter((rawJob) => !isListingReviewPosting(rawJob));
      const { kept: allJobCandidates, skipped: staleSkipped } = applyPostedDateFilter(beforeDateFilter, runOptions.postedDate);
      if (staleSkipped > 0) {
        stats.jobsStaleSkipped = (stats.jobsStaleSkipped ?? 0) + staleSkipped;
        await appendProgress(
          run.id,
          `Skipped ${staleSkipped} posting(s) from ${source.name} based on posting date filters.`,
          stats,
        );
      }

      const fetchFilter = await filterJobsBeforeFetchedRecording(allJobCandidates, source.type, profiles);
      if (fetchFilter.titleFiltered > 0) {
        stats.jobsTitleFiltered = (stats.jobsTitleFiltered ?? 0) + fetchFilter.titleFiltered;
      }
      if (fetchFilter.deadSkipped > 0) {
        stats.jobsDeadSkipped = (stats.jobsDeadSkipped ?? 0) + fetchFilter.deadSkipped;
      }
      if (fetchFilter.urlChecked > 0) {
        stats.jobsUrlChecked = (stats.jobsUrlChecked ?? 0) + fetchFilter.urlChecked;
      }
      if (fetchFilter.titleFiltered > 0 || fetchFilter.deadSkipped > 0) {
        await appendProgress(
          run.id,
          `Search-query filter for ${source.name}:${fetchedFilterSummary(fetchFilter, source.type)}`,
          stats,
        );
      }

      recordFetchedSourceJobs(run.id, source, fetchFilter.kept, (count) => {
        stats.jobsFetched += count;
      });

      await updateRunStats(
        run.id,
        stats,
        `Fetched ${fetchFilter.kept.length} unique jobs from ${source.name} (${uniqueRawJobs.length} raw, ${staleSkipped} skipped by date${fetchedFilterSummary(fetchFilter, source.type)}).`,
      );

      for (const profile of profiles) {
        if (await isCancelled()) break;

        const jobCandidates = jobCandidatesForProfile(source.type, fetchFilter.kept, profile);
        await processSourceJobsForProfile({
          run,
          source,
          adapter,
          profile,
          jobCandidates,
          stats,
          user,
          suppressionStateByUserId,
          newMatches,
        });
      }

      await updateRunStats(run.id, stats, `Finished ${source.name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown source adapter error";
      errors.push({
        source: source.name,
        profile: "",
        message,
      });
      await appendProgress(run.id, `Error from ${source.name}: ${message}`, stats);
    }
  }

  if (await isCancelled()) {
    await prisma.jobSearchRun.update({
      where: { id: run.id },
      data: {
        jobsFetched: stats.jobsFetched,
        jobsAfterDedupe: stats.jobsAfterDedupe,
        jobsAfterFilters: stats.jobsAfterFilters,
        jobsSaved: stats.jobsSaved,
      },
    });
    await flushFetchedSearchRunItems(run.id);
    await appendProgress(run.id, `Search cancelled. Saved ${stats.jobsSaved} matches before stopping.`, stats);
    return;
  }

  await flushFetchedSearchRunItems(run.id);

  const status = errors.length && stats.jobsFetched > 0 ? "partial" : errors.length ? "failed" : "completed";
  const updatedRun = await prisma.jobSearchRun.update({
    where: { id: run.id },
    data: {
      jobsFetched: stats.jobsFetched,
      jobsAfterDedupe: stats.jobsAfterDedupe,
      jobsAfterFilters: stats.jobsAfterFilters,
      jobsSaved: stats.jobsSaved,
      status,
      errors: errors as Prisma.InputJsonValue,
      finishedAt: new Date(),
    },
  });
  await appendProgress(run.id, `Search ${status}. Saved ${stats.jobsSaved} new matches from ${stats.jobsFetched} fetched jobs.`, stats);
  await runDuplicateStaleJobDetectorAgent({ limit: 1000, userId: user?.id }).catch(async (error) => {
    await appendProgress(run.id, `Duplicate/stale detector failed: ${error instanceof Error ? error.message : "Unknown detector failure"}`, stats);
  });
  await autoRunAgencyAfterSearch({
    runId: run.id,
    userId: user?.id ?? null,
    status,
    jobsSaved: stats.jobsSaved,
    stats,
  });

  if (user?.notificationSettings) {
    await notifyAfterRun(user, user.notificationSettings, updatedRun, newMatches);
  }

  return updatedRun;
}

export async function autoRunAgencyAfterSearch(input: {
  runId: string;
  userId?: string | null;
  status: "completed" | "partial" | "failed";
  jobsSaved: number;
  stats: JobSearchStats;
}) {
  if (!["completed", "partial"].includes(input.status)) {
    await appendProgress(input.runId, "Recruiting agency skipped because the search did not finish successfully.", input.stats, {
      status: "skipped",
      reason: "search_not_successful",
    });
    return { started: false, reason: "search_not_successful" as const };
  }

  const activeAgencyRun = await prisma.agentRun.findFirst({
    where: { agentType: "RECRUITING_AGENCY", status: { in: ["PENDING", "RUNNING"] } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (activeAgencyRun) {
    await appendProgress(input.runId, "Recruiting agency skipped because an agency run is already active.", input.stats, {
      status: "running",
      reason: "agency_already_running",
      agentRunId: activeAgencyRun.id,
    });
    return { started: false, reason: "agency_already_running" as const, agentRunId: activeAgencyRun.id };
  }

  const eligible = await prisma.jobProfileMatch.findFirst({
    where: {
      status: "needs_review",
      overallScore: { gte: 90 },
      ...(input.userId ? { jobSearchProfile: { userId: input.userId } } : {}),
      jobPosting: {
        applicationUrl: { not: null },
        applications: {
          none: {
            status: { in: ["applied", "follow_up_due", "screening", "interviewing", "offer", "rejected_by_company"] },
          },
        },
      },
    },
    select: { id: true },
    orderBy: [{ overallScore: "desc" }, { updatedAt: "desc" }],
  });
  if (!eligible) {
    const message = input.jobsSaved <= 0
      ? "Recruiting agency skipped because the search saved no new matches and no existing 90+ application-ready matches were eligible."
      : "Recruiting agency skipped because no new 90+ application-ready matches were eligible.";
    await appendProgress(input.runId, message, input.stats, {
      status: "skipped",
      reason: "no_eligible_matches",
    });
    return { started: false, reason: "no_eligible_matches" as const };
  }

  try {
    const result = await runRecruitingAgency({
      minimumScore: 90,
      limit: 10,
      triggeredBy: "search_auto",
      onStarted: async (agentRunId) => {
        await appendProgress(
          input.runId,
          input.jobsSaved <= 0
            ? "Recruiting agency auto-started for existing eligible strong matches."
            : "Recruiting agency auto-started to approve strong matches and prepare application packets.",
          input.stats,
          {
            status: "started",
            reason: "started",
            agentRunId,
          },
        );
      },
    });
    await appendProgress(
      input.runId,
      `Recruiting agency completed: approved ${result.approved}, prepared ${result.prepared}, failed ${result.failed}.`,
      input.stats,
      {
        status: "completed",
        reason: "started",
        agentRunId: result.agentRunId,
        result: {
          approved: result.approved,
          prepared: result.prepared,
          failed: result.failed,
          skipped: result.skipped,
        },
      },
    );
    return { started: true, reason: "started" as const, agentRunId: result.agentRunId, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown agency failure";
    await appendProgress(input.runId, `Recruiting agency auto-run failed: ${message}`, input.stats, {
      status: "failed",
      reason: "agency_failed",
      error: message,
    });
    return { started: false, reason: "agency_failed" as const, error: message };
  }
}

async function processSourceJobsForProfile(input: {
  run: JobSearchRun;
  source: JobSource;
  adapter: JobSourceAdapter;
  profile: JobSearchProfile;
  jobCandidates: RawJobPosting[];
  stats: JobSearchStats;
  user: (User & { notificationSettings: NotificationSettings | null }) | null;
  suppressionStateByUserId: Awaited<ReturnType<typeof loadJobSuppressionStatesByUserIds>>;
  newMatches: Array<{ score: number; title: string; company: string; profile: string }>;
}) {
  const { run, source, adapter, profile, jobCandidates, stats, user, suppressionStateByUserId, newMatches } = input;
  let savedForProfile = 0;

  const rankedJobs = (await Promise.all(jobCandidates.map(async (rawJob) => {
    const normalized = await adapter.normalize(rawJob);
    const evaluation = evaluateJobAgainstProfile(normalized, profile);
    const classification = classifyJobSearchTitle(normalized.title, normalized.description);
    recordSearchDiagnostics(stats, classification);
    return { normalized, evaluation, classification, rawJob };
  })))
    .filter((item) => item.evaluation.tier !== "reject")
    .sort((a, b) => tierSortRank(b.evaluation.tier) - tierSortRank(a.evaluation.tier) || b.evaluation.overallScore - a.evaluation.overallScore);
  stats.jobsScored = (stats.jobsScored ?? 0) + rankedJobs.length;
  const jobsToScore = rankedJobs.slice(0, Math.min(rankedJobs.length, Math.max(profile.maxResultsPerRun * 8, 160), 600));
  await appendProgress(run.id, `Scoring ${jobsToScore.length} ${source.name} jobs for ${profile.name}.`, stats);

  for (const [index, rankedJob] of jobsToScore.entries()) {
    if (savedForProfile >= profile.maxResultsPerRun) break;

    const { normalized, evaluation, rawJob } = rankedJob;
    const suppressionState = suppressionStateByUserId.get(profile.userId);
    if (suppressionState && isJobSuppressed(jobIdentity(normalized), suppressionState)) {
      stats.jobsSuppressed = (stats.jobsSuppressed ?? 0) + 1;
      continue;
    }

    let urlHealth: "dead" | "closed" | "ok" | "blocked" | undefined;
    if (normalized.applicationUrl) {
      const urlResult = await checkJobApplicationUrl(normalized.applicationUrl);
      urlHealth = urlResult.status;
      if (urlResult.status === "dead" || urlResult.status === "closed") {
        stats.jobsBelowThreshold = (stats.jobsBelowThreshold ?? 0) + 1;
        continue;
      }
    }

    const finalEvaluation = urlHealth
      ? evaluateJobAgainstProfile({ ...normalized, urlHealth }, profile)
      : evaluation;
    if (finalEvaluation.tier === "reject") {
      stats.jobsBelowThreshold = (stats.jobsBelowThreshold ?? 0) + 1;
      continue;
    }

    const { job, isNew } = await upsertDedupedJob(normalized, source.id);
    if (suppressionState && isJobSuppressed(job, suppressionState)) {
      stats.jobsSuppressed = (stats.jobsSuppressed ?? 0) + 1;
      continue;
    }
    if (isNew) {
      stats.jobsAfterDedupe += 1;
      await recordSearchRunItems(run.id, [
        pipelineRunItem("new", job, profile, source.name, finalEvaluation, rawJob.rawData, source.type),
      ]);
    }

    if (urlHealth && urlHealth !== "ok" && urlHealth !== "blocked") {
      const staleScore = staleScoreForUrlHealth(urlHealth, job.staleScore);
      if (staleScore !== job.staleScore) {
        await prisma.jobPosting.update({ where: { id: job.id }, data: { staleScore } });
      }
    }

    const existing = await prisma.jobProfileMatch.findUnique({
      where: {
        jobPostingId_jobSearchProfileId: {
          jobPostingId: job.id,
          jobSearchProfileId: profile.id,
        },
      },
    });
    const matchPayload = buildMatchPayload(finalEvaluation, profile.id, discoveryMetadata(rawJob, profile.id, profile.name, source.name, run.id));
    await prisma.jobProfileMatch.upsert({
      where: {
        jobPostingId_jobSearchProfileId: {
          jobPostingId: job.id,
          jobSearchProfileId: profile.id,
        },
      },
      update: {
        ...matchPayload,
        status: existing?.status ?? "needs_review",
      },
      create: {
        jobPostingId: job.id,
        jobSearchProfileId: profile.id,
        status: "needs_review",
        ...matchPayload,
      },
    });
    await runJobFitScoringAgent({
      jobPostingId: job.id,
      jobSearchProfileId: profile.id,
      userId: user?.id,
    }).catch(async (error) => {
      await appendProgress(run.id, `Evidence scoring failed for ${job.title} at ${job.company}: ${error instanceof Error ? error.message : "Unknown scoring failure"}`, stats);
    });
    stats.jobsAfterFilters += 1;
    await recordSearchRunItems(run.id, [
      pipelineRunItem("matched", job, profile, source.name, finalEvaluation, rawJob.rawData, source.type),
    ]);
    if (!existing) {
      stats.jobsSaved += 1;
      savedForProfile += 1;
      newMatches.push({ score: finalEvaluation.overallScore, title: job.title, company: job.company, profile: profile.name });
      await recordSearchRunItems(run.id, [
        pipelineRunItem("saved", job, profile, source.name, finalEvaluation, rawJob.rawData, source.type),
      ]);
      await updateRunStats(run.id, stats, `Saved ${finalEvaluation.tier} match: ${finalEvaluation.overallScore} - ${job.title} at ${job.company}.`);
    }
    if ((index + 1) % 50 === 0) {
      await updateRunStats(run.id, stats, `Scored ${index + 1}/${jobsToScore.length} ${source.name} jobs for ${profile.name}.`);
    }
  }
}

function jobIdentity(job: Pick<NormalizedJobPosting, "company" | "title" | "location" | "applicationUrl">) {
  return {
    company: job.company,
    title: job.title,
    location: job.location ?? null,
    applicationUrl: job.applicationUrl ?? null,
  };
}

function recordSearchDiagnostics(stats: JobSearchStats, classification: ReturnType<typeof classifyJobSearchTitle>) {
  if (classification.frontend) stats.frontendTitles = (stats.frontendTitles ?? 0) + 1;
  if (classification.fullStack) stats.fullStackTitles = (stats.fullStackTitles ?? 0) + 1;
  if (classification.overSenior) stats.staffPrincipalLeadTitles = (stats.staffPrincipalLeadTitles ?? 0) + 1;
  if (classification.management) stats.managementTitles = (stats.managementTitles ?? 0) + 1;
  if (classification.backendDataPlatformOnly) stats.backendDataPlatformTitles = (stats.backendDataPlatformTitles ?? 0) + 1;
  if (classification.nonTarget) stats.nonTargetTitles = (stats.nonTargetTitles ?? 0) + 1;
  if (classification.genericSoftwareWithoutFrontend) stats.genericSoftwareTitles = (stats.genericSoftwareTitles ?? 0) + 1;
}

function listingReviewMessage(raw: { listingReview?: { url: string; reason: string; sourceTitle?: string; query?: string; blocked?: boolean } }) {
  const listing = raw.listingReview;
  if (!listing) return "Suppressed a search listing page before scoring.";
  const blocked = listing.blocked ? " Fetch was blocked or unavailable." : "";
  const query = listing.query ? ` Query: ${listing.query}.` : "";
  const title = listing.sourceTitle ? ` Title: ${listing.sourceTitle}.` : "";
  return `Suppressed search listing page before scoring: ${listing.url}. Reason: ${listing.reason}.${blocked}${title}${query}`;
}

async function updateRunStats(runId: string, stats: JobSearchStats, message?: string) {
  const progress = message ? await nextProgress(runId, progressEvent(message, stats)) : undefined;
  await prisma.jobSearchRun.update({
    where: { id: runId },
    data: {
      jobsFetched: stats.jobsFetched,
      jobsAfterDedupe: stats.jobsAfterDedupe,
      jobsAfterFilters: stats.jobsAfterFilters,
      jobsSaved: stats.jobsSaved,
      ...(progress ? { progress: progress as Prisma.InputJsonValue } : {}),
    },
  });
}

async function appendProgress(
  runId: string,
  message: string,
  stats?: JobSearchStats,
  agencyHandoff?: AgencyHandoffProgress,
) {
  const progress = await nextProgress(runId, progressEvent(message, stats, agencyHandoff));
  await prisma.jobSearchRun.update({
    where: { id: runId },
    data: {
      progress: progress as Prisma.InputJsonValue,
    },
  });
}

async function nextProgress(runId: string, event: ProgressEvent) {
  const run = await prisma.jobSearchRun.findUnique({
    where: { id: runId },
    select: { progress: true },
  });
  const current = Array.isArray(run?.progress) ? (run.progress as ProgressEvent[]) : [];
  return [...current, event].slice(-120);
}

function progressEvent(
  message: string,
  stats?: JobSearchStats,
  agencyHandoff?: AgencyHandoffProgress,
): ProgressEvent {
  return {
    at: new Date().toISOString(),
    message,
    ...(stats ? { stats } : {}),
    ...(agencyHandoff ? { agencyHandoff } : {}),
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function tierSortRank(tier: EvaluationResult["tier"]) {
  if (tier === "full") return 2;
  if (tier === "partial") return 1;
  return 0;
}

function buildMatchPayload(evaluation: EvaluationResult, profileId: string, discovery: Record<string, unknown>) {
  return {
    matchTier: evaluation.tier === "partial" ? "partial" as const : "full" as const,
    discoveredByProfileId: profileId,
    overallScore: evaluation.overallScore,
    titleFit: evaluation.titleFit,
    skillFit: evaluation.skillFit,
    seniorityFit: evaluation.seniorityFit,
    industryFit: evaluation.industryFit,
    compensationFit: evaluation.compensationFit,
    remoteFit: evaluation.remoteFit,
    relocationFit: evaluation.relocationFit,
    strongestMatches: evaluation.strongestMatches as Prisma.InputJsonValue,
    concerns: evaluation.concerns as Prisma.InputJsonValue,
    missingKeywords: evaluation.missingKeywords as Prisma.InputJsonValue,
    failedRequirements: evaluation.failedRequirements as Prisma.InputJsonValue,
    passedRequirements: evaluation.passedRequirements as Prisma.InputJsonValue,
    discoveryMetadata: discovery as Prisma.InputJsonValue,
    recommendedAction: evaluation.recommendedAction,
    aiExplanation: evaluation.aiExplanation,
  };
}

function discoveryMetadata(rawJob: { rawData?: unknown }, profileId: string, profileName: string, sourceName: string, searchRunId: string) {
  const rawData = rawJob.rawData && typeof rawJob.rawData === "object" && !Array.isArray(rawJob.rawData)
    ? rawJob.rawData as Record<string, unknown>
    : {};
  return {
    profileId,
    profileName,
    sourceName,
    searchRunId,
    query: typeof rawData.query === "string" ? rawData.query : undefined,
    provider: typeof rawData.provider === "string" ? rawData.provider : undefined,
  };
}

function stripDiscoveryFromDescription(description: string) {
  return description
    .split("\n\n")
    .filter((block) => !/^matched query:/i.test(block.trim()) && !/^profile:/i.test(block.trim()) && !/^search listing page review:/i.test(block.trim()))
    .join("\n\n")
    .trim();
}

function sourcePriority(type: string) {
  const priority: Record<string, number> = {
    greenhouse: 1,
    lever: 2,
    ashby: 3,
    company_site: 4,
    weworkremotely: 8,
    remoteok: 99,
  };
  return priority[type] ?? 50;
}

async function upsertDedupedJob(normalized: NormalizedJobPosting, sourceId: string) {
  const contentHash = createJobContentHash(normalized);
  const existing =
    (normalized.applicationUrl
      ? await prisma.jobPosting.findFirst({ where: { applicationUrl: normalized.applicationUrl } })
      : null) ??
    (normalized.sourceJobId
      ? await prisma.jobPosting.findFirst({ where: { sourceId, sourceJobId: normalized.sourceJobId } })
      : null) ??
    (await prisma.jobPosting.findUnique({ where: { contentHash } })) ??
    (await prisma.jobPosting.findFirst({
      where: {
        company: normalized.company,
        title: normalized.title,
        location: normalized.location,
      },
    })) ??
    (await findCanonicalDuplicateJob(normalized));

  const cleanDescription = stripDiscoveryFromDescription(normalized.description);

  if (existing) {
    const description = cleanDescription.length >= existing.description.length ? cleanDescription : existing.description;
    const job = await prisma.jobPosting.update({
      where: { id: existing.id },
      data: {
        sourceId,
        sourceJobId: normalized.sourceJobId,
        company: normalized.company,
        title: normalized.title,
        location: normalized.location || existing.location,
        country: normalized.country ?? existing.country,
        city: normalized.city ?? existing.city,
        remoteType: normalized.remoteType !== "unknown" ? normalized.remoteType : existing.remoteType,
        salaryMin: normalized.salaryMin ?? existing.salaryMin,
        salaryMax: normalized.salaryMax ?? existing.salaryMax,
        salaryCurrency: normalized.salaryCurrency ?? existing.salaryCurrency,
        description,
        requirements: normalized.requirements,
        niceToHaves: normalized.niceToHaves,
        benefits: normalized.benefits,
        applicationUrl: normalized.applicationUrl,
        atsProvider: normalized.atsProvider,
        rawData: normalized.rawData as Prisma.InputJsonValue,
        lastSeenAt: new Date(),
      },
    });
    return { job, isNew: false };
  }

  const job = await prisma.jobPosting.create({
    data: {
      sourceId,
      sourceJobId: normalized.sourceJobId,
      company: normalized.company,
      title: normalized.title,
      location: normalized.location,
      country: normalized.country,
      city: normalized.city,
      remoteType: normalized.remoteType,
      salaryMin: normalized.salaryMin,
      salaryMax: normalized.salaryMax,
      salaryCurrency: normalized.salaryCurrency,
      description: cleanDescription,
      requirements: normalized.requirements,
      niceToHaves: normalized.niceToHaves,
      benefits: normalized.benefits,
      applicationUrl: normalized.applicationUrl,
      atsProvider: normalized.atsProvider,
      rawData: normalized.rawData as Prisma.InputJsonValue,
      contentHash,
    },
  });
  return { job, isNew: true };
}

async function findCanonicalDuplicateJob(normalized: NormalizedJobPosting) {
  const canonicalKeys = createCanonicalJobKeys(normalized);
  const companyToken = firstSearchToken(normalized.company);
  const titleToken = firstSearchToken(normalized.title);
  const candidates = await prisma.jobPosting.findMany({
    where: {
      OR: [
        ...(companyToken ? [{ company: { contains: companyToken, mode: "insensitive" as const } }] : []),
        ...(titleToken ? [{ title: { contains: titleToken, mode: "insensitive" as const } }] : []),
      ],
    },
    orderBy: { lastSeenAt: "desc" },
    take: 100,
  });

  return candidates.find((candidate) => hasSameCanonicalJob(candidate, normalized)) ??
    candidates.find((candidate) => createCanonicalJobKeys(candidate).some((key) => canonicalKeys.includes(key))) ??
    null;
}

function firstSearchToken(value: string) {
  return value.toLowerCase().match(/[a-z0-9]{4,}/)?.[0] ?? null;
}

async function notifyAfterRun(
  user: User,
  settings: NotificationSettings,
  run: JobSearchRun,
  newMatches: Array<{ score: number; title: string; company: string; profile: string }>,
) {
  if (settings.notifyOnlyIfNewMatches && newMatches.length === 0) return;

  const strongMatches = newMatches.filter((match) => match.score >= settings.minimumScoreForPush);
  if (settings.digestMode === "strong_matches_only" && strongMatches.length === 0) return;

  const topMatches = newMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((match) => `${match.score} - ${match.title} - ${match.company} (${match.profile})`)
    .join("\n");
  const subject = `${newMatches.length} new jobs found, ${strongMatches.length} strong matches`;
  const body = [
    "The job search run finished.",
    "",
    `Fetched: ${run.jobsFetched}`,
    `New after dedupe: ${run.jobsAfterDedupe}`,
    `Saved for agency review: ${run.jobsSaved}`,
    `Strong matches: ${strongMatches.length}`,
    "",
    "Top matches:",
    topMatches || "No new matches.",
    "",
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/jobs`,
  ].join("\n");

  await sendNotification({
    user,
    settings,
    subject,
    body,
    payload: { runId: run.id, newMatches, strongMatches },
  });
}
