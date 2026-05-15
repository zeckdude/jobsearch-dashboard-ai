import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCandidateIntelligenceAgent } from "@/lib/agents/candidate-intelligence";
import { backfillEvidenceEmbeddings } from "@/lib/evidence/embeddings";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/agents/candidate-intelligence", () => ({
  runCandidateIntelligenceAgent: vi.fn(),
}));

vi.mock("@/lib/evidence/embeddings", () => ({
  backfillEvidenceEmbeddings: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

const findUserMock = vi.mocked(prisma.user.findFirst);
const candidateAgentMock = vi.mocked(runCandidateIntelligenceAgent);
const embeddingsMock = vi.mocked(backfillEvidenceEmbeddings);

describe("POST /api/evidence/ingest-note", () => {
  beforeEach(() => {
    findUserMock.mockReset();
    candidateAgentMock.mockReset();
    embeddingsMock.mockReset();
  });

  it("requires an existing candidate profile", async () => {
    findUserMock.mockResolvedValue({ id: "user_1", profile: null } as unknown as Awaited<ReturnType<typeof prisma.user.findFirst>>);

    const response = await POST(new Request("http://localhost/api/evidence/ingest-note", {
      method: "POST",
      body: JSON.stringify({ title: "Project note", content: "Built a React and TypeScript internal tool." }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "A candidate profile is required before adding evidence.",
    });
  });

  it("ingests a note through candidate intelligence and can embed the result", async () => {
    findUserMock.mockResolvedValue({
      id: "user_1",
      profile: { id: "profile_1" },
    } as unknown as Awaited<ReturnType<typeof prisma.user.findFirst>>);
    candidateAgentMock.mockResolvedValue({
      output: {
        evidenceItems: [{ id: "ev_1", title: "React platform work" }],
        needsReviewItems: [],
        warnings: [],
        suggestedProfileUpdates: [],
        confidence: 0.88,
        reasoningSummary: "Converted note.",
      },
    } as unknown as Awaited<ReturnType<typeof runCandidateIntelligenceAgent>>);
    embeddingsMock.mockResolvedValue({ embedded: 1 } as unknown as Awaited<ReturnType<typeof backfillEvidenceEmbeddings>>);

    const response = await POST(new Request("http://localhost/api/evidence/ingest-note", {
      method: "POST",
      body: JSON.stringify({
        title: "React platform work",
        content: "Built a React and TypeScript internal tooling surface for application workflows.",
        sourceType: "INTERVIEW_NOTE",
        embed: true,
      }),
    }));

    expect(candidateAgentMock).toHaveBeenCalledWith(expect.objectContaining({
      candidateProfileId: "profile_1",
      userId: "user_1",
      sourceType: "INTERVIEW_NOTE",
      notes: [{ title: "React platform work", content: "Built a React and TypeScript internal tooling surface for application workflows." }],
    }));
    expect(embeddingsMock).toHaveBeenCalledWith({
      candidateProfileId: "profile_1",
      evidenceIds: ["ev_1"],
      limit: 1,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      evidenceItems: [{ id: "ev_1", title: "React platform work" }],
      embedding: { embedded: 1 },
      message: "Added 1 evidence item.",
    });
  });
});
