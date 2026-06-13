import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    resumeUpload: {
      create: vi.fn(),
    },
  },
}));

const findFirstMock = vi.mocked(prisma.user.findFirst);
const createMock = vi.mocked(prisma.resumeUpload.create);

const parsedJson = {
  contactInfo: { fullName: "Alex Rivera" },
  professionalSummary: "Engineer",
  skills: { coreSkills: ["React"], technicalSkills: ["React"], toolsFrameworksLibraries: [], programmingLanguages: [] },
  workExperience: [
    {
      company: "Acme",
      title: "Engineer",
      startDate: "2020",
      endDate: "2024",
      isCurrent: false,
      skills: [],
      achievements: ["Built dashboards."],
    },
  ],
  experienceBullets: [
    {
      company: "Acme",
      role: "Engineer",
      text: "Built dashboards.",
      category: "frontend",
      metrics: {},
      keywords: [],
      sourceText: "Built dashboards.",
      truthLevel: "verified",
    },
  ],
  projects: [],
  education: [],
  certifications: [],
  inferredTags: [],
  fieldsNeedingReview: [],
  confidence: 0.8,
};

describe("POST /api/resumes/uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://example";
    findFirstMock.mockResolvedValue({ id: "user_1", profile: { id: "profile_1" } } as Awaited<ReturnType<typeof prisma.user.findFirst>>);
    createMock.mockResolvedValue({ id: "upload_1", parsingStatus: "needs_review" } as Awaited<ReturnType<typeof prisma.resumeUpload.create>>);
  });

  it("creates a needs_review upload when the user confirms preview data", async () => {
    const response = await POST(
      new Request("http://localhost/api/resumes/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "resume.pdf",
          fileType: "application/pdf",
          extractedText: "Alex Rivera\nEXPERIENCE\nAcme",
          parsedJson,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parsingStatus: "needs_review",
          fileName: "resume.pdf",
        }),
      }),
    );
  });
});
