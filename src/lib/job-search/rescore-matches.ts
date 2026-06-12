import { Prisma, type JobSearchProfile } from "@prisma/client";
import { loadFavoritedJobIds } from "@/lib/jobs/favorites";
import { evaluateJobAgainstProfile, type EvaluationResult } from "@/lib/job-search/scoring";
import { checkJobApplicationUrl, staleScoreForUrlHealth } from "@/lib/job-search/url-health";
import { prisma } from "@/lib/prisma";

type RescoreMatchRow = {
  id: string;
  jobPosting: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    description: string;
    salaryMin: number | null;
    salaryMax: number | null;
    remoteType: string;
    staleScore: number;
    applicationUrl: string | null;
  };
  jobSearchProfile: JobSearchProfile;
};

export type RescoreSampleDelete = {
  id: string;
  reason: string;
  job: string;
  protectedFavorite: boolean;
};

export type RescoreSampleUpdate = {
  id: string;
  tier: EvaluationResult["tier"];
  job: string;
  pendingRequirements: string[];
};

export type RescoreNeedsReviewResult = {
  dryRun: boolean;
  total: number;
  toDelete: number;
  toUpdate: number;
  skippedFavorites: number;
  fullCount: number;
  partialCount: number;
  deleted: number;
  updated: number;
  sampleDeletes: RescoreSampleDelete[];
  sampleUpdates: RescoreSampleUpdate[];
};

function matchPayload(evaluation: EvaluationResult) {
  return {
    matchTier: evaluation.tier === "full" ? "full" as const : "partial" as const,
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
    recommendedAction: evaluation.recommendedAction,
    aiExplanation: evaluation.aiExplanation,
  };
}

export async function rescoreNeedsReviewMatches(input: {
  dryRun?: boolean;
  userId?: string;
} = {}): Promise<RescoreNeedsReviewResult> {
  const dryRun = input.dryRun !== false;
  const favoritedJobIds = input.userId ? await loadFavoritedJobIds(input.userId) : new Set<string>();

  const matches = await prisma.jobProfileMatch.findMany({
    where: { status: "needs_review" },
    include: {
      jobPosting: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          description: true,
          salaryMin: true,
          salaryMax: true,
          remoteType: true,
          staleScore: true,
          applicationUrl: true,
        },
      },
      jobSearchProfile: true,
    },
  });

  const toDelete: Array<{ id: string; reason: string; job: string; jobPostingId: string }> = [];
  const toUpdate: Array<{ id: string; evaluation: EvaluationResult; jobPostingId: string; staleScore?: number; job: string }> = [];
  const skippedFavoriteUpdates: Array<{ id: string; evaluation: EvaluationResult; jobPostingId: string; staleScore?: number }> = [];

  for (const match of matches) {
    const evaluation = await evaluateMatch(match);
    const jobLabel = `${match.jobPosting.title} @ ${match.jobPosting.company} (${match.jobPosting.location ?? "no location"}) — ${match.jobSearchProfile.name}`;

    if (evaluation.result.tier === "reject") {
      if (favoritedJobIds.has(match.jobPosting.id)) {
        skippedFavoriteUpdates.push({
          id: match.id,
          evaluation: evaluation.result,
          jobPostingId: match.jobPosting.id,
          staleScore: evaluation.staleScore,
        });
        continue;
      }
      const hardFail = evaluation.result.failedRequirements.find((f) => f.severity === "hard");
      toDelete.push({
        id: match.id,
        jobPostingId: match.jobPosting.id,
        reason: hardFail?.label ?? evaluation.result.failedRequirements[0]?.label ?? "Failed requirements",
        job: jobLabel,
      });
      continue;
    }

    toUpdate.push({
      id: match.id,
      evaluation: evaluation.result,
      jobPostingId: match.jobPosting.id,
      staleScore: evaluation.staleScore,
      job: jobLabel,
    });
  }

  const fullCount = toUpdate.filter((item) => item.evaluation.tier === "full").length
    + skippedFavoriteUpdates.filter((item) => item.evaluation.tier === "full").length;
  const partialCount = toUpdate.filter((item) => item.evaluation.tier === "partial").length
    + skippedFavoriteUpdates.filter((item) => item.evaluation.tier === "partial").length;

  const sampleDeletes: RescoreSampleDelete[] = toDelete.slice(0, 20).map((item) => ({
    id: item.id,
    reason: item.reason,
    job: item.job,
    protectedFavorite: false,
  }));

  const sampleUpdates: RescoreSampleUpdate[] = [...toUpdate, ...skippedFavoriteUpdates.map((item) => {
    const match = matches.find((row) => row.id === item.id)!;
    return {
      id: item.id,
      evaluation: item.evaluation,
      jobPostingId: item.jobPostingId,
      staleScore: item.staleScore,
      job: `${match.jobPosting.title} @ ${match.jobPosting.company} — ${match.jobSearchProfile.name}`,
    };
  })].slice(0, 10).map((item) => ({
    id: item.id,
    tier: item.evaluation.tier,
    job: item.job,
    pendingRequirements: item.evaluation.failedRequirements.map((f) => f.label),
  }));

  let deleted = 0;
  let updated = 0;

  if (!dryRun) {
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100).map((item) => item.id);
      const result = await prisma.jobProfileMatch.deleteMany({ where: { id: { in: batch } } });
      deleted += result.count;
    }

    for (const item of [...toUpdate, ...skippedFavoriteUpdates]) {
      await prisma.jobProfileMatch.update({
        where: { id: item.id },
        data: matchPayload(item.evaluation),
      });
      if (item.staleScore !== undefined) {
        await prisma.jobPosting.update({
          where: { id: item.jobPostingId },
          data: { staleScore: item.staleScore },
        });
      }
      updated += 1;
    }
  }

  return {
    dryRun,
    total: matches.length,
    toDelete: toDelete.length,
    toUpdate: toUpdate.length + skippedFavoriteUpdates.length,
    skippedFavorites: skippedFavoriteUpdates.length,
    fullCount,
    partialCount,
    deleted,
    updated,
    sampleDeletes,
    sampleUpdates,
  };
}

async function evaluateMatch(match: RescoreMatchRow) {
  const job = match.jobPosting;
  let urlHealth: "dead" | "closed" | "ok" | "blocked" | undefined;
  let staleScore = job.staleScore;

  if (job.applicationUrl) {
    const urlResult = await checkJobApplicationUrl(job.applicationUrl);
    urlHealth = urlResult.status;
    const nextStale = staleScoreForUrlHealth(urlResult.status, staleScore);
    if (nextStale !== staleScore) staleScore = nextStale;
  }

  const result = evaluateJobAgainstProfile(
    {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description ?? "",
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      remoteType: job.remoteType,
      staleScore,
      urlHealth,
    },
    match.jobSearchProfile,
  );

  return {
    result,
    tier: result.tier,
    failedRequirements: result.failedRequirements,
    staleScore: staleScore !== job.staleScore ? staleScore : undefined,
  };
}
