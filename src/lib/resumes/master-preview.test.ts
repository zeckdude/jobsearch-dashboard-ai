import { describe, expect, it } from "vitest";
import { buildMasterResumePlainText } from "@/lib/resumes/master-preview";

describe("buildMasterResumePlainText", () => {
  it("includes required ATS sections and verified bullets only", () => {
    const plainText = buildMasterResumePlainText({
      profile: {
        fullName: "Alex Rivera",
        email: "alex@example.com",
        phone: "555-0100",
        location: "Austin, TX",
        linkedinUrl: "https://linkedin.com/in/alex",
        githubUrl: null,
        portfolioUrl: null,
        professionalSummary: "Senior engineer with product delivery experience.",
        masterSummary: "Senior engineer with product delivery experience.",
        coreSkills: ["React", "TypeScript"],
        technicalSkills: ["Next.js"],
      },
      bullets: [
        {
          company: "Acme",
          role: "Senior Engineer",
          text: "Led migration of customer dashboard to React.",
          truthLevel: "verified",
          category: "frontend",
        },
        {
          company: "Beta",
          role: "Engineer",
          text: "Draft bullet that should be excluded.",
          truthLevel: "needs_review",
          category: "frontend",
        },
      ],
      workExperiences: [
        {
          company: "Acme",
          title: "Senior Engineer",
          startDate: "2021",
          endDate: "Present",
          isCurrent: true,
          summary: null,
          skills: [],
          achievements: [],
          createdAt: new Date("2024-01-01"),
        },
      ],
    });

    expect(plainText).toContain("Alex Rivera");
    expect(plainText).toContain("alex@example.com");
    expect(plainText).toContain("Summary");
    expect(plainText).toContain("Skills");
    expect(plainText).toContain("Professional Experience");
    expect(plainText).toContain("Led migration of customer dashboard to React.");
    expect(plainText).not.toContain("Draft bullet that should be excluded.");
  });

  it("renders additional sections between education and projects", () => {
    const plainText = buildMasterResumePlainText({
      profile: {
        fullName: "Alex Rivera",
        email: "alex@example.com",
        phone: null,
        location: null,
        linkedinUrl: null,
        githubUrl: null,
        portfolioUrl: null,
        professionalSummary: "Engineer.",
        masterSummary: "Engineer.",
        coreSkills: ["React"],
        technicalSkills: [],
      },
      bullets: [
        {
          company: "Acme",
          role: "Engineer",
          text: "Shipped features.",
          truthLevel: "verified",
          category: "frontend",
        },
      ],
      education: ["State University — B.S. Computer Science"],
      additionalSections: [{ title: "AI Engineering", content: "Built RAG pipelines for internal tools." }],
      projects: [{ name: "Portfolio", description: "Personal site", technologies: ["Next.js"] }],
      certifications: ["AWS Certified Developer"],
    });

    const educationIndex = plainText.indexOf("Education");
    const additionalIndex = plainText.indexOf("AI Engineering");
    const projectsIndex = plainText.indexOf("Projects");
    const certificationsIndex = plainText.indexOf("Certifications");

    expect(educationIndex).toBeGreaterThan(-1);
    expect(additionalIndex).toBeGreaterThan(educationIndex);
    expect(projectsIndex).toBeGreaterThan(additionalIndex);
    expect(certificationsIndex).toBeGreaterThan(projectsIndex);
    expect(plainText).toContain("Built RAG pipelines for internal tools.");
  });
});
