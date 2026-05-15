import type { Application, CandidateEvidence, GeneratedCoverLetter, GeneratedResume, JobPosting, JobProfileMatch } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildInterviewPrep, preferFocusedInterviewEvidence } from "@/lib/agents/interview-prep";

describe("buildInterviewPrep", () => {
  it("builds grounded prep themes and evidence stories", () => {
    const now = new Date();
    const job = {
      id: "job",
      company: "IdentityCo",
      title: "Senior Frontend Engineer",
      description: "Build React TypeScript authentication workflows, passkeys, dashboards, and design-system components.",
    } as JobPosting;
    const application = {
      id: "app",
      jobPosting: job,
      jobProfileMatch: { concerns: ["Salary range is unknown."] } as unknown as JobProfileMatch,
      resume: { generationNotes: { resumeStrategy: { emphasisTags: ["react", "typescript", "webauthn"] } } } as unknown as GeneratedResume,
      coverLetter: null as GeneratedCoverLetter | null,
      createdAt: now,
      updatedAt: now,
    } as unknown as Application & {
      coverLetter: GeneratedCoverLetter | null;
      jobPosting: JobPosting;
      jobProfileMatch: JobProfileMatch | null;
      resume: GeneratedResume | null;
    };
    const prep = buildInterviewPrep(application, [
      {
        id: "ev1",
        title: "WebAuthn Core",
        content: "Reusable WebAuthn orchestration package for passkey registration and authentication flows.",
        tags: ["webauthn", "security", "typescript"],
      },
    ] as CandidateEvidence[]);

    expect(prep.likelyThemes).toEqual(expect.arrayContaining(["React/TypeScript product UI depth", "security, identity, and authentication workflows"]));
    expect(prep.evidenceStories[0]?.evidenceRef).toBe("ev1");
    expect(prep.risksToPrepare).toContain("Salary range is unknown.");
    expect(prep.questionsToAsk.some((question) => question.includes("authentication"))).toBe(true);
  });

  it("prefers focused evidence over broad approved resume snapshots", () => {
    const now = new Date();
    const broadResume = {
      id: "resume_blob",
      title: "Approved resume: Carl-Welch-CV-2026.pdf",
      content: "React TypeScript authentication dashboard senior frontend engineer. ".repeat(30),
      sourceType: "RESUME_UPLOAD",
      sourceRef: "upload-1",
      tags: ["react", "typescript"],
      createdAt: now,
      updatedAt: now,
    } as CandidateEvidence;
    const focused = {
      id: "project",
      title: "WebAuthn Core",
      content: "Reusable WebAuthn package for passkey registration and authentication flows.",
      sourceType: "GITHUB_REPO",
      sourceRef: "repo-1",
      tags: ["webauthn", "security", "typescript"],
      createdAt: now,
      updatedAt: now,
    } as CandidateEvidence;
    const secondFocused = {
      ...focused,
      id: "progression",
      title: "Progression Lab AI",
      content: "Next.js AI product with structured OpenAI outputs and admin controls.",
      sourceRef: "repo-2",
    } as CandidateEvidence;

    const evidence = preferFocusedInterviewEvidence([broadResume, focused, secondFocused]);
    expect(evidence.map((item) => item.id)).toEqual(["project", "progression"]);
  });
});
