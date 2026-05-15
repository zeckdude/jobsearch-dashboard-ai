import type { Application, ApplicationOutcome, GeneratedCoverLetter, GeneratedResume, JobPosting, JobProfileMatch, JobSearchProfile, JobSource } from "@prisma/client";
import { runAgent } from "@/lib/agents/run-agent";
import { jsonArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";

export type OutcomeLearningInput = {
  userId?: string;
};

export type OutcomeLearningOutput = {
  sampleSize: number;
  statusCounts: Record<string, number>;
  outcomeCounts: Record<string, number>;
  profilePerformance: Array<{
    profileId: string;
    profileName: string;
    applications: number;
    applied: number;
    positiveOutcomes: number;
    negativeOutcomes: number;
    callbackRate: number;
    averageMatchScore: number;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    recommendation: string;
  }>;
  sourcePerformance: Array<{
    sourceName: string;
    applications: number;
    applied: number;
    positiveOutcomes: number;
    callbackRate: number;
    recommendation: string;
  }>;
  resumeSignals: Array<{
    signal: string;
    applications: number;
    positiveOutcomes: number;
    recommendation: string;
  }>;
  recommendations: string[];
  warnings: string[];
  rationale: string;
  confidence: number;
};

type ApplicationRecord = Application & {
  coverLetter: GeneratedCoverLetter | null;
  jobPosting: JobPosting & { source: JobSource | null };
  jobProfileMatch: (JobProfileMatch & { jobSearchProfile: JobSearchProfile }) | null;
  outcomes: ApplicationOutcome[];
  resume: GeneratedResume | null;
};

export async function runOutcomeLearningAgent(input: OutcomeLearningInput = {}) {
  return runAgent<OutcomeLearningInput, OutcomeLearningOutput>({
    agentType: "OUTCOME_LEARNING",
    input,
    userId: input.userId,
    execute: async () => {
      const applications = await prisma.application.findMany({
        where: input.userId ? { userId: input.userId } : undefined,
        include: {
          coverLetter: true,
          jobPosting: { include: { source: true } },
          jobProfileMatch: { include: { jobSearchProfile: true } },
          outcomes: { orderBy: { occurredAt: "desc" } },
          resume: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 500,
      });

      return buildOutcomeLearning(applications);
    },
  });
}

export function buildOutcomeLearning(applications: ApplicationRecord[]): OutcomeLearningOutput {
  const statusCounts = countBy(applications, effectiveStatus);
  const outcomeCounts = countBy(applications.flatMap((application) => application.outcomes), (outcome) => outcome.outcome);
  const profilePerformance = profileStats(applications);
  const sourcePerformance = sourceStats(applications);
  const resumeSignals = signalStats(applications);
  const recommendations = buildRecommendations(profilePerformance, sourcePerformance, resumeSignals, applications.length);
  const warnings = buildWarnings(applications.length, profilePerformance);

  return {
    sampleSize: applications.length,
    statusCounts,
    outcomeCounts,
    profilePerformance,
    sourcePerformance,
    resumeSignals,
    recommendations,
    warnings,
    rationale: "Analyzed application status history by search profile, source, resume strategy, and material signals. Low sample sizes are labeled explicitly.",
    confidence: applications.length >= 40 ? 0.82 : applications.length >= 15 ? 0.68 : 0.48,
  };
}

function profileStats(applications: ApplicationRecord[]): OutcomeLearningOutput["profilePerformance"] {
  const byProfile = groupBy(
    applications.filter((application) => application.jobProfileMatch?.jobSearchProfile),
    (application) => application.jobProfileMatch?.jobSearchProfileId ?? "unknown",
  );

  return Array.from(byProfile.entries())
    .map(([profileId, items]) => {
      const profileName = items[0]?.jobProfileMatch?.jobSearchProfile.name ?? "Unknown profile";
      const applied = items.filter((item) => isApplied(effectiveStatus(item))).length;
      const positiveOutcomes = items.filter((item) => isPositiveOutcome(effectiveStatus(item))).length;
      const negativeOutcomes = items.filter((item) => isNegativeOutcome(effectiveStatus(item))).length;
      const averageMatchScore = average(items.map((item) => item.jobProfileMatch?.overallScore ?? 0).filter((score) => score > 0));
      const callbackRate = rate(positiveOutcomes, applied);
      const confidence = confidenceLabel(items.length);
      return {
        profileId,
        profileName,
        applications: items.length,
        applied,
        positiveOutcomes,
        negativeOutcomes,
        callbackRate,
        averageMatchScore,
        confidence,
        recommendation: profileRecommendation({ profileName, applications: items.length, applied, positiveOutcomes, negativeOutcomes, callbackRate, averageMatchScore, confidence }),
      };
    })
    .sort((left, right) => right.callbackRate - left.callbackRate || right.averageMatchScore - left.averageMatchScore);
}

function sourceStats(applications: ApplicationRecord[]): OutcomeLearningOutput["sourcePerformance"] {
  const bySource = groupBy(applications, (application) => application.jobPosting.source?.name ?? "Manual");
  return Array.from(bySource.entries())
    .map(([sourceName, items]) => {
      const applied = items.filter((item) => isApplied(effectiveStatus(item))).length;
      const positiveOutcomes = items.filter((item) => isPositiveOutcome(effectiveStatus(item))).length;
      const callbackRate = rate(positiveOutcomes, applied);
      return {
        sourceName,
        applications: items.length,
        applied,
        positiveOutcomes,
        callbackRate,
        recommendation: sourceRecommendation(sourceName, items.length, applied, callbackRate),
      };
    })
    .sort((left, right) => right.callbackRate - left.callbackRate || right.applications - left.applications);
}

function signalStats(applications: ApplicationRecord[]): OutcomeLearningOutput["resumeSignals"] {
  const rows = applications.flatMap((application) => {
    const notes = objectValue(application.resume?.generationNotes);
    const strategy = objectValue(notes.resumeStrategy);
    const tags = jsonArray(strategy.emphasisTags);
    const generatedBy = typeof notes.generatedBy === "string" ? [notes.generatedBy] : [];
    const qa = objectValue(notes.applicationQa);
    const qaStatus = typeof qa.status === "string" ? [`qa:${qa.status.toLowerCase()}`] : [];
    return [...tags, ...generatedBy, ...qaStatus].slice(0, 12).map((signal) => ({ signal, application }));
  });
  const bySignal = groupBy(rows, (row) => row.signal.toLowerCase());

  return Array.from(bySignal.entries())
    .filter(([, rowsForSignal]) => rowsForSignal.length >= 2)
    .map(([signal, rowsForSignal]) => {
      const applicationsForSignal = rowsForSignal.map((row) => row.application);
      const positiveOutcomes = applicationsForSignal.filter((application) => isPositiveOutcome(effectiveStatus(application))).length;
      return {
        signal,
        applications: applicationsForSignal.length,
        positiveOutcomes,
        recommendation: positiveOutcomes > 0
          ? `Keep using ${signal} when the role supports it.`
          : `Track ${signal}; no positive outcomes yet.`,
      };
    })
    .sort((left, right) => right.positiveOutcomes - left.positiveOutcomes || right.applications - left.applications)
    .slice(0, 12);
}

function buildRecommendations(
  profiles: OutcomeLearningOutput["profilePerformance"],
  sources: OutcomeLearningOutput["sourcePerformance"],
  signals: OutcomeLearningOutput["resumeSignals"],
  sampleSize: number,
) {
  const recommendations: string[] = [];
  const bestProfile = profiles.find((profile) => profile.applied >= 3 && profile.callbackRate > 0);
  const noisyProfile = profiles.find((profile) => profile.applications >= 8 && profile.negativeOutcomes > profile.positiveOutcomes && profile.callbackRate === 0);
  const bestSource = sources.find((source) => source.applied >= 3 && source.callbackRate > 0);
  const bestSignal = signals.find((signal) => signal.positiveOutcomes > 0);

  if (bestProfile) recommendations.push(`${bestProfile.profileName} is showing the strongest outcome signal. Keep approving similar roles and compare against the next 10 applications.`);
  if (noisyProfile) recommendations.push(`${noisyProfile.profileName} is producing weak outcomes. Narrow titles, raise match threshold, or pause it until there is better evidence.`);
  if (bestSource) recommendations.push(`${bestSource.sourceName} has the best callback signal so far. Prioritize that source when search time is limited.`);
  if (bestSignal) recommendations.push(`Materials using ${bestSignal.signal} have at least one positive outcome. Keep using it only where the job description supports that positioning.`);
  if (sampleSize < 15) recommendations.push("Outcome sample size is still small. Treat these recommendations as directional until more applications are marked applied and updated.");
  if (recommendations.length === 0) recommendations.push("No reliable winning pattern yet. Keep tracking outcomes and update statuses after recruiter screens, rejections, and follow-ups.");

  return recommendations;
}

function buildWarnings(sampleSize: number, profiles: OutcomeLearningOutput["profilePerformance"]) {
  const warnings: string[] = [];
  if (sampleSize === 0) warnings.push("No applications are tracked yet.");
  if (sampleSize > 0 && profiles.every((profile) => profile.applied === 0)) warnings.push("No applications are marked applied yet, so callback rate cannot be measured.");
  if (profiles.some((profile) => profile.confidence === "LOW")) warnings.push("Some profile recommendations have low confidence because sample size is small.");
  return warnings;
}

function profileRecommendation(input: {
  profileName: string;
  applications: number;
  applied: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  callbackRate: number;
  averageMatchScore: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
}) {
  if (input.confidence === "LOW") return "Keep collecting outcomes before changing this profile.";
  if (input.callbackRate >= 0.25) return "This profile is getting traction. Continue and inspect common title/source patterns.";
  if (input.applied >= 5 && input.positiveOutcomes === 0) return "No callback signal yet. Tighten keywords, raise score threshold, or revise positioning.";
  if (input.negativeOutcomes > input.positiveOutcomes && input.applications >= 8) return "High negative signal. Review whether this campaign is too broad.";
  if (input.averageMatchScore >= 82) return "Strong match scores. Keep running, but track applied outcomes before scaling volume.";
  return "Monitor this profile as more applications reach applied or screening.";
}

function sourceRecommendation(sourceName: string, applications: number, applied: number, callbackRate: number) {
  if (applied < 3) return `Collect more applied outcomes before judging ${sourceName}.`;
  if (callbackRate > 0) return `${sourceName} has callback signal. Keep it in the source mix.`;
  if (applications >= 8) return `${sourceName} is not producing positive outcomes yet. Review source quality and duplicate rate.`;
  return `Monitor ${sourceName}.`;
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const nextKey = key(item);
    counts[nextKey] = (counts[nextKey] ?? 0) + 1;
  }
  return counts;
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const nextKey = key(item);
    groups.set(nextKey, [...(groups.get(nextKey) ?? []), item]);
  }
  return groups;
}

function rate(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function confidenceLabel(sampleSize: number): "LOW" | "MEDIUM" | "HIGH" {
  if (sampleSize >= 20) return "HIGH";
  if (sampleSize >= 8) return "MEDIUM";
  return "LOW";
}

function isApplied(status: string) {
  return ["applied", "follow_up_due", "screening", "interviewing", "offer", "rejected_by_company"].includes(status);
}

function isPositiveOutcome(status: string) {
  return ["screening", "interviewing", "offer"].includes(status);
}

function isNegativeOutcome(status: string) {
  return ["rejected", "rejected_by_company", "archived"].includes(status);
}

function effectiveStatus(application: Pick<ApplicationRecord, "status" | "outcomes">) {
  const latestOutcome = application.outcomes[0]?.outcome;
  if (!latestOutcome) return application.status;
  if (latestOutcome === "APPLIED") return "applied";
  if (latestOutcome === "RECRUITER_SCREEN") return "screening";
  if (latestOutcome === "TECH_SCREEN" || latestOutcome === "ONSITE" || latestOutcome === "FINAL") return "interviewing";
  if (latestOutcome === "OFFER") return "offer";
  if (latestOutcome === "REJECTED") return "rejected_by_company";
  if (latestOutcome === "GHOSTED") return "follow_up_due";
  return "archived";
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
