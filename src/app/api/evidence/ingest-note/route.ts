import { NextResponse } from "next/server";
import { z } from "zod";
import { runCandidateIntelligenceAgent } from "@/lib/agents/candidate-intelligence";
import { apiError } from "@/lib/api";
import { backfillEvidenceEmbeddings } from "@/lib/evidence/embeddings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ingestNoteSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(10),
  sourceType: z.enum(["USER_INPUT", "INTERVIEW_NOTE", "APPLICATION_HISTORY"]).default("USER_INPUT"),
  embed: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const body = ingestNoteSchema.parse(await request.json());
    const user = await prisma.user.findFirst({
      include: { profile: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (!user?.profile) {
      return NextResponse.json({ error: "A candidate profile is required before adding evidence." }, { status: 400 });
    }

    const sourceRef = `manual-note:${Date.now()}`;
    const result = await runCandidateIntelligenceAgent({
      candidateProfileId: user.profile.id,
      userId: user.id,
      sourceType: body.sourceType,
      sourceRef,
      notes: [{ title: body.title, content: body.content }],
    });
    const evidenceIds = result.output.evidenceItems.map((item) => item.id);
    const embedding = body.embed
      ? await backfillEvidenceEmbeddings({ candidateProfileId: user.profile.id, evidenceIds, limit: evidenceIds.length || 1 })
      : null;

    return NextResponse.json({
      ...result.output,
      embedding,
      message: `Added ${result.output.evidenceItems.length} evidence item${result.output.evidenceItems.length === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
