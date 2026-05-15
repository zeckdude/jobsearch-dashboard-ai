import type { CandidateEvidence, EvidenceChunk, Prisma } from "@prisma/client";
import { jsonArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";

export type EvidenceChunkDraft = {
  chunkIndex: number;
  content: string;
  metadata: Prisma.InputJsonValue;
};

const MAX_CHUNK_LENGTH = 900;
const MAX_CHUNKS_PER_EVIDENCE = 8;

export function createEvidenceChunks(evidence: Pick<CandidateEvidence, "id" | "title" | "content" | "type" | "sourceType" | "sourceRef" | "tags">): EvidenceChunkDraft[] {
  const text = normalizeWhitespace(evidence.content);
  if (!text) return [];
  const pieces = splitIntoChunks(text, MAX_CHUNK_LENGTH).slice(0, MAX_CHUNKS_PER_EVIDENCE);
  return pieces.map((piece, index) => ({
    chunkIndex: index,
    content: piece,
    metadata: {
      title: evidence.title,
      type: evidence.type,
      sourceType: evidence.sourceType,
      sourceRef: evidence.sourceRef,
      tags: jsonArray(evidence.tags),
    } as Prisma.InputJsonValue,
  }));
}

export async function syncEvidenceChunks(evidence: CandidateEvidence) {
  const chunks = createEvidenceChunks(evidence);
  await prisma.$transaction(async (tx) => {
    await tx.evidenceChunk.deleteMany({
      where: {
        evidenceId: evidence.id,
        chunkIndex: { gte: chunks.length },
      },
    });

    for (const chunk of chunks) {
      await tx.evidenceChunk.upsert({
        where: {
          evidenceId_chunkIndex: {
            evidenceId: evidence.id,
            chunkIndex: chunk.chunkIndex,
          },
        },
        update: {
          content: chunk.content,
          metadata: chunk.metadata,
          embeddingModel: null,
          dimensions: null,
          vector: [],
          contentHash: null,
        },
        create: {
          evidenceId: evidence.id,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          metadata: chunk.metadata,
        },
      });
    }
  });
  return chunks.length;
}

export function chunkEmbeddingText(chunk: Pick<EvidenceChunk, "content" | "metadata">) {
  const metadata = objectValue(chunk.metadata);
  return [
    typeof metadata.title === "string" ? metadata.title : "",
    typeof metadata.type === "string" ? metadata.type : "",
    Array.isArray(metadata.tags) ? metadata.tags.filter((item): item is string => typeof item === "string").join(", ") : "",
    chunk.content,
  ].filter(Boolean).join("\n");
}

function splitIntoChunks(text: string, maxLength: number) {
  if (text.length <= maxLength) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  if (!sentences.length) return sliceByLength(text, maxLength);

  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...sliceByLength(sentence, maxLength));
      continue;
    }
    if (current.length && `${current} ${sentence}`.length > maxLength) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function sliceByLength(text: string, maxLength: number) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += maxLength) {
    chunks.push(text.slice(index, index + maxLength));
  }
  return chunks;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
