import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { checkAtsReadability } from "@/lib/resumes/ats";
import { PATCH } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    generatedResume: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/resumes/ats", () => ({
  checkAtsReadability: vi.fn(),
}));

const findUniqueMock = vi.mocked(prisma.generatedResume.findUnique);
const updateMock = vi.mocked(prisma.generatedResume.update);
const checkAtsReadabilityMock = vi.mocked(checkAtsReadability);

describe("PATCH /api/resumes/generated/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkAtsReadabilityMock.mockReturnValue({
      textExtractable: true,
      contactInfoDetected: true,
      sectionsDetected: ["Summary", "Skills"],
      missingSections: [],
      extractedTextLength: 600,
      warnings: [],
      score: 94,
    });
  });

  it("saves edited resume content and refreshes ATS checks", async () => {
    const content = [
      "Carl Welch",
      "",
      "Summary",
      "Edited resume summary with enough content to pass validation.",
      "",
      "Skills",
      "Model Context Protocol (MCP), React, TypeScript, LangGraph, Prisma, Postgres",
      "",
      "Professional Experience",
      "- Built integration workflows and application-state systems.",
    ].join("\n");
    findUniqueMock.mockResolvedValue({
      id: "resume_1",
      generationNotes: { customOpportunity: true },
    } as unknown as Awaited<ReturnType<typeof prisma.generatedResume.findUnique>>);
    updateMock.mockResolvedValue({
      id: "resume_1",
      plainText: content,
      markdown: content,
      atsChecks: { score: 94 },
    } as unknown as Awaited<ReturnType<typeof prisma.generatedResume.update>>);

    const response = await PATCH(new Request("http://localhost/api/resumes/generated/resume_1", {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }), { params: { id: "resume_1" } });

    expect(response.status).toBe(200);
    expect(checkAtsReadabilityMock).toHaveBeenCalledWith(content);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "resume_1" },
      data: expect.objectContaining({
        plainText: content,
        markdown: content,
        generationNotes: expect.objectContaining({
          customOpportunity: true,
          manuallyEdited: true,
        }),
      }),
    }));
    await expect(response.json()).resolves.toMatchObject({
      resume: { id: "resume_1", plainText: content },
      message: "Resume saved.",
    });
  });

  it("returns 404 when the resume does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await PATCH(new Request("http://localhost/api/resumes/generated/missing", {
      method: "PATCH",
      body: JSON.stringify({ content: "x".repeat(150) }),
    }), { params: { id: "missing" } });

    expect(response.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
