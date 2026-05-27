import { JobMatchStatus, JobSuppressionKind, type Prisma } from "@prisma/client";
import { submittedApplicationStatuses } from "@/lib/applications/job-filters";
import { createCanonicalJobKeys } from "@/lib/job-search/dedupe";
import { prisma } from "@/lib/prisma";
import { recordJobSuppression } from "@/lib/jobs/suppression";

const activeMatchStatuses: JobMatchStatus[] = [
  JobMatchStatus.discovered,
  JobMatchStatus.needs_review,
  JobMatchStatus.approved,
  JobMatchStatus.saved_for_later,
  JobMatchStatus.resume_generated,
  JobMatchStatus.cover_letter_generated,
  JobMatchStatus.ready_to_apply,
];

const sourceMatchStatuses: JobMatchStatus[] = [
  JobMatchStatus.rejected,
  JobMatchStatus.archived,
  JobMatchStatus.ready_to_apply,
  ...submittedApplicationStatuses,
];

type RepairReason = "submitted" | "rejected" | "archived" | "ready_to_apply_duplicate";
type SourceKind = "submitted" | "rejected" | "archived" | "ready_to_apply";
type SourceType = "application" | "match" | "suppression";

type RepairJobIdentity = {
  id?: string;
  company: string;
  title: string;
  location: string | null;
  applicationUrl?: string | null;
  duplicateGroupId?: string | null;
};

export type SuppressionRepairSource = {
  id: string;
  userId: string;
  type: SourceType;
  kind: SourceKind;
  status: JobMatchStatus;
  job: RepairJobIdentity;
  jobProfileMatchId?: string | null;
  applicationId?: string | null;
};

export type SuppressionRepairActiveMatch = {
  id: string;
  userId: string;
  status: JobMatchStatus;
  jobPostingId: string;
  job: RepairJobIdentity;
};

export type SuppressionRepairDecision = {
  matchId: string;
  jobPostingId: string;
  sourceId: string;
  sourceType: SourceType;
  sourceKind: SourceKind;
  reason: RepairReason;
  fromStatus: JobMatchStatus;
  toStatus: JobMatchStatus;
};

export type SuppressionRepairResult = {
  scannedActiveMatches: number;
  sourceSignals: number;
  repairedMatches: number;
  recordedSuppressions: number;
  byReason: Record<RepairReason, number>;
  decisions: SuppressionRepairDecision[];
};

const emptyReasonCounts = (): Record<RepairReason, number> => ({
  submitted: 0,
  rejected: 0,
  archived: 0,
  ready_to_apply_duplicate: 0,
});

export async function repairSuppressedJobResurfacing(input: { userId?: string | null; source?: string } = {}): Promise<SuppressionRepairResult> {
  const source = input.source ?? "duplicate_suppression_repair";
  const [applications, sourceMatches, suppressions, activeMatches] = await Promise.all([
    prisma.application.findMany({
      where: {
        userId: input.userId ?? undefined,
        status: { in: [...submittedApplicationStatuses, JobMatchStatus.ready_to_apply] },
      },
      select: {
        id: true,
        userId: true,
        status: true,
        jobProfileMatchId: true,
        jobPosting: { select: jobSelect },
      },
      take: 2000,
    }),
    prisma.jobProfileMatch.findMany({
      where: {
        status: { in: sourceMatchStatuses },
        ...(input.userId ? { jobSearchProfile: { userId: input.userId } } : {}),
      },
      select: {
        id: true,
        status: true,
        jobPosting: { select: jobSelect },
        jobSearchProfile: { select: { userId: true } },
      },
      take: 3000,
    }),
    prisma.jobSuppression.findMany({
      where: {
        userId: input.userId ?? undefined,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        kind: { in: [JobSuppressionKind.SUBMITTED_JOB, JobSuppressionKind.REJECTED_JOB, JobSuppressionKind.ARCHIVED_JOB] },
      },
      select: {
        id: true,
        userId: true,
        kind: true,
        applicationId: true,
        jobProfileMatchId: true,
        duplicateGroupId: true,
        jobPosting: { select: jobSelect },
      },
      take: 3000,
    }),
    prisma.jobProfileMatch.findMany({
      where: {
        status: { in: activeMatchStatuses },
        ...(input.userId ? { jobSearchProfile: { userId: input.userId } } : {}),
      },
      select: {
        id: true,
        status: true,
        jobPostingId: true,
        jobPosting: { select: jobSelect },
        jobSearchProfile: { select: { userId: true } },
      },
      take: 5000,
    }),
  ]);

  const sources: SuppressionRepairSource[] = [
    ...applications.map((application) => ({
      id: application.id,
      userId: application.userId,
      type: "application" as const,
      kind: sourceKindForApplicationStatus(application.status),
      status: application.status,
      job: application.jobPosting,
      jobProfileMatchId: application.jobProfileMatchId,
      applicationId: application.id,
    })),
    ...sourceMatches.map((match) => ({
      id: match.id,
      userId: match.jobSearchProfile.userId,
      type: "match" as const,
      kind: sourceKindForMatchStatus(match.status),
      status: match.status,
      job: match.jobPosting,
      jobProfileMatchId: match.id,
      applicationId: null,
    })),
    ...suppressions.flatMap((suppression) => {
      if (!suppression.jobPosting) return [];
      const kind = sourceKindForSuppressionKind(suppression.kind);
      return [{
        id: suppression.id,
        userId: suppression.userId,
        type: "suppression" as const,
        kind,
        status: statusForSourceKind(kind),
        job: { ...suppression.jobPosting, duplicateGroupId: suppression.duplicateGroupId ?? suppression.jobPosting.duplicateGroupId },
        jobProfileMatchId: suppression.jobProfileMatchId,
        applicationId: suppression.applicationId,
      }];
    }),
  ];
  const active = activeMatches.map((match) => ({
    id: match.id,
    userId: match.jobSearchProfile.userId,
    status: match.status,
    jobPostingId: match.jobPostingId,
    job: match.jobPosting,
  }));
  const decisions = buildSuppressionRepairDecisions({ sources, activeMatches: active });
  if (decisions.length) {
    await prisma.$transaction(decisions.map((decision) => prisma.jobProfileMatch.updateMany({
      where: { id: decision.matchId, status: { not: decision.toStatus } },
      data: { status: decision.toStatus, reviewedAt: new Date() },
    })));
  }

  let recordedSuppressions = 0;
  const sourceById = new Map(sources.map((item) => [`${item.type}:${item.id}`, item]));
  const activeById = new Map(active.map((item) => [item.id, item]));
  const suppressionInputs = new Map<string, Parameters<typeof recordJobSuppression>[0]>();
  for (const decision of decisions) {
    const matchedSource = sourceById.get(`${decision.sourceType}:${decision.sourceId}`);
    const activeMatch = activeById.get(decision.matchId);
    if (matchedSource) {
      const kind = suppressionKindForDecision(decision);
      suppressionInputs.set(`${matchedSource.userId}:${kind}:${matchedSource.job.id ?? matchedSource.id}`, {
        userId: matchedSource.userId,
        kind,
        job: matchedSource.job,
        source,
        reason: decision.reason,
        jobProfileMatchId: matchedSource.jobProfileMatchId ?? null,
        applicationId: matchedSource.applicationId ?? null,
      });
    }
    if (activeMatch) {
      const kind = suppressionKindForDecision(decision);
      suppressionInputs.set(`${activeMatch.userId}:${kind}:${activeMatch.jobPostingId}:${decision.matchId}`, {
        userId: activeMatch.userId,
        kind,
        job: activeMatch.job,
        source,
        reason: decision.reason,
        jobProfileMatchId: decision.matchId,
        applicationId: null,
      });
    }
  }
  for (const suppressionInput of suppressionInputs.values()) {
    await recordJobSuppression(suppressionInput);
    recordedSuppressions += 1;
  }

  const byReason = emptyReasonCounts();
  for (const decision of decisions) byReason[decision.reason] += 1;

  return {
    scannedActiveMatches: active.length,
    sourceSignals: sources.length,
    repairedMatches: decisions.length,
    recordedSuppressions,
    byReason,
    decisions,
  };
}

export function buildSuppressionRepairDecisions(input: {
  sources: SuppressionRepairSource[];
  activeMatches: SuppressionRepairActiveMatch[];
}): SuppressionRepairDecision[] {
  const decisions: SuppressionRepairDecision[] = [];
  for (const match of input.activeMatches) {
    const source = chooseRepairSource(match, input.sources);
    if (!source) continue;
    const reason = reasonForSource(source);
    const toStatus = statusForRepair(source);
    if (match.status === toStatus) continue;
    decisions.push({
      matchId: match.id,
      jobPostingId: match.jobPostingId,
      sourceId: source.id,
      sourceType: source.type,
      sourceKind: source.kind,
      reason,
      fromStatus: match.status,
      toStatus,
    });
  }
  return decisions;
}

function chooseRepairSource(match: SuppressionRepairActiveMatch, sources: SuppressionRepairSource[]) {
  return sources
    .filter((source) => source.userId === match.userId && !isSourceRecord(match, source) && hasMatchingJobIdentity(match.job, source.job))
    .sort((left, right) => sourcePriority(left.kind) - sourcePriority(right.kind))[0] ?? null;
}

function hasMatchingJobIdentity(active: RepairJobIdentity, source: RepairJobIdentity) {
  if (active.duplicateGroupId && source.duplicateGroupId && active.duplicateGroupId === source.duplicateGroupId) return true;
  const sourceKeys = new Set(createCanonicalJobKeys(source));
  return createCanonicalJobKeys(active).some((key) => sourceKeys.has(key));
}

function isSourceRecord(match: SuppressionRepairActiveMatch, source: SuppressionRepairSource) {
  if (source.jobProfileMatchId && source.jobProfileMatchId === match.id) return true;
  if (source.kind === "ready_to_apply" && source.job.id && source.job.id === match.jobPostingId) return true;
  return false;
}

function reasonForSource(source: SuppressionRepairSource): RepairReason {
  if (source.kind === "ready_to_apply") return "ready_to_apply_duplicate";
  return source.kind;
}

function statusForRepair(source: SuppressionRepairSource) {
  if (source.kind === "submitted") return source.status;
  if (source.kind === "rejected") return JobMatchStatus.rejected;
  return JobMatchStatus.archived;
}

function sourcePriority(kind: SourceKind) {
  if (kind === "submitted") return 0;
  if (kind === "rejected") return 1;
  if (kind === "archived") return 2;
  return 3;
}

function sourceKindForMatchStatus(status: JobMatchStatus): SourceKind {
  if (status === JobMatchStatus.rejected) return "rejected";
  if (status === JobMatchStatus.archived) return "archived";
  if (submittedApplicationStatuses.includes(status)) return "submitted";
  return "ready_to_apply";
}

function sourceKindForApplicationStatus(status: JobMatchStatus): SourceKind {
  if (status === JobMatchStatus.ready_to_apply) return "ready_to_apply";
  if (status === JobMatchStatus.archived) return "archived";
  return "submitted";
}

function sourceKindForSuppressionKind(kind: JobSuppressionKind): SourceKind {
  if (kind === JobSuppressionKind.SUBMITTED_JOB) return "submitted";
  if (kind === JobSuppressionKind.REJECTED_JOB) return "rejected";
  return "archived";
}

function statusForSourceKind(kind: SourceKind) {
  if (kind === "submitted") return JobMatchStatus.applied;
  if (kind === "rejected") return JobMatchStatus.rejected;
  if (kind === "archived") return JobMatchStatus.archived;
  return JobMatchStatus.ready_to_apply;
}

function suppressionKindForDecision(decision: SuppressionRepairDecision) {
  if (decision.reason === "submitted") return JobSuppressionKind.SUBMITTED_JOB;
  if (decision.reason === "rejected") return JobSuppressionKind.REJECTED_JOB;
  return JobSuppressionKind.ARCHIVED_JOB;
}

const jobSelect = {
  id: true,
  company: true,
  title: true,
  location: true,
  applicationUrl: true,
  duplicateGroupId: true,
} satisfies Prisma.JobPostingSelect;
