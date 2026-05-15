import type { CandidateEvidence, EvidenceConfidence, Prisma } from "@prisma/client";
import { confidenceWhere } from "@/lib/evidence/confidence";
import { cosineSimilarity, createQueryEmbedding, numericVector } from "@/lib/evidence/embeddings";
import { normalizeTags } from "@/lib/evidence/tags";
import { prisma } from "@/lib/prisma";

type EvidenceUse = "resume" | "coverLetter" | "recruiterMessage";

export type RetrieveCandidateEvidenceInput = {
  candidateProfileId?: string;
  jobId?: string;
  searchProfileId?: string;
  resumeProfileId?: string;
  query?: string;
  requiredTags?: string[];
  excludedEvidenceIds?: string[];
  confidenceMinimum?: EvidenceConfidence;
  usableFor?: EvidenceUse;
  limit?: number;
};

export type RetrievedEvidence = CandidateEvidence & {
  relevanceScore: number;
};

export async function retrieveCandidateEvidence(input: RetrieveCandidateEvidenceInput): Promise<RetrievedEvidence[]> {
  const candidateProfileId = input.candidateProfileId ?? (await firstCandidateProfileId());
  if (!candidateProfileId) return [];

  const confidenceMinimum = input.confidenceMinimum ?? "INFERRED";
  const requiredTags = normalizeTags(input.requiredTags ?? []);
  const where: Prisma.CandidateEvidenceWhereInput = {
    candidateProfileId,
    confidence: { in: confidenceWhere(confidenceMinimum) },
    id: input.excludedEvidenceIds?.length ? { notIn: input.excludedEvidenceIds } : undefined,
    ...(input.usableFor === "resume" ? { usableInResume: true } : {}),
    ...(input.usableFor === "coverLetter" ? { usableInCoverLetter: true } : {}),
    ...(input.usableFor === "recruiterMessage" ? { usableInRecruiterMessage: true } : {}),
  };

  const evidence = await prisma.candidateEvidence.findMany({
    where,
    include: {
      embeddings: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
    take: Math.max(input.limit ?? 24, 100),
  });
  const queryEmbedding = await createQueryEmbedding(input.query);

  const scoredEvidence = evidence
    .map((item) => {
      const lexicalScore = scoreEvidenceText(item, input.query, requiredTags);
      const vectorScore = queryEmbedding ? scoreEvidenceVector(item.embeddings[0]?.vector, queryEmbedding.vector) : 0;
      return {
        ...item,
        relevanceScore: vectorScore ? lexicalScore + vectorScore : lexicalScore,
      };
    })
    .filter((item) => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore || b.updatedAt.getTime() - a.updatedAt.getTime());

  return dedupeRetrievedEvidence(scoredEvidence)
    .slice(0, input.limit ?? 24);
}

function scoreEvidenceVector(vectorJson: unknown, queryVector: number[]) {
  const vector = numericVector(vectorJson);
  const similarity = cosineSimilarity(vector, queryVector);
  return similarity > 0 ? similarity * 20 : 0;
}

export function scoreEvidenceText(evidence: Pick<CandidateEvidence, "title" | "content" | "tags" | "confidence"> & Partial<Pick<CandidateEvidence, "sourceType" | "sourceRef">>, query?: string, requiredTags: string[] = []) {
  const tags = normalizeTags(evidence.tags);
  if (requiredTags.length && !requiredTags.every((tag) => tags.includes(tag))) return 0;
  const queryTerms = normalizeQueryTerms(query);
  const haystack = `${evidence.title} ${evidence.content} ${tags.join(" ")}`.toLowerCase();
  const confidenceBoost = evidence.confidence === "VERIFIED" ? 3 : evidence.confidence === "INFERRED" ? 2 : 1;
  const tagBoost = requiredTags.length ? requiredTags.length * 4 : 0;
  const specificityPenalty = isBroadResumeEvidence(evidence) ? 8 : 0;
  if (!queryTerms.length) return Math.max(0, confidenceBoost + tagBoost + tags.length * 0.1 - specificityPenalty);
  const termScore = queryTerms.reduce((score, term) => score + (haystack.includes(term) ? 3 : 0), 0);
  return Math.max(0, termScore + tagBoost + confidenceBoost - specificityPenalty);
}

export function dedupeRetrievedEvidence<T extends Pick<CandidateEvidence, "title" | "content" | "sourceType" | "sourceRef" | "updatedAt"> & { relevanceScore: number }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = evidenceIdentityKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isBroadResumeEvidence(evidence: Pick<CandidateEvidence, "title" | "content"> & Partial<Pick<CandidateEvidence, "sourceType" | "sourceRef">>) {
  return evidence.sourceType === "RESUME_UPLOAD"
    && !String(evidence.sourceRef ?? "").includes(":chunk:")
    && /^approved resume:/i.test(evidence.title)
    && evidence.content.length > 1000;
}

function evidenceIdentityKey(evidence: Pick<CandidateEvidence, "title" | "content" | "sourceType" | "sourceRef">) {
  if (isBroadResumeEvidence(evidence)) {
    return `broad-resume:${normalizeEvidenceText(evidence.content).slice(0, 700)}`;
  }
  return [
    evidence.sourceType,
    evidence.sourceRef ?? "",
    normalizeEvidenceText(evidence.title),
    normalizeEvidenceText(evidence.content).slice(0, 500),
  ].join("|");
}

function normalizeEvidenceText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeQueryTerms(query?: string) {
  return (query ?? "")
    .toLowerCase()
    .split(/[\s,]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}

async function firstCandidateProfileId() {
  const profile = await prisma.userProfile.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return profile?.id ?? null;
}
