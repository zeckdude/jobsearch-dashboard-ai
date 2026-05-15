import type { CandidateEvidence, Contact, JobPosting, UserProfile } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildRecruiterOutreachDraft, reviewRecruiterMessage } from "@/lib/agents/recruiter-intelligence";

describe("recruiter intelligence", () => {
  it("builds concise outreach from approved evidence without sending it", () => {
    const draft = buildRecruiterOutreachDraft({
      job: {
        id: "job",
        company: "IdentityCo",
        title: "Senior Frontend Engineer",
        description: "React TypeScript authentication workflows.",
      } as JobPosting,
      profile: {
        fullName: "Carl Welch",
        githubUrl: "https://github.com/carl",
        linkedinUrl: "https://linkedin.com/in/carl",
        portfolioUrl: null,
      } as UserProfile,
      contact: {
        id: "contact",
        name: "Alex Recruiter",
        title: "Technical Recruiter",
        company: "IdentityCo",
      } as Contact,
      evidence: [
        {
          id: "ev1",
          title: "WebAuthn Core",
          content: "Reusable WebAuthn orchestration package for passkey registration and authentication flows.",
          tags: ["webauthn", "security", "typescript"],
          confidence: "VERIFIED",
        },
        {
          id: "ev2",
          title: "Progression Lab AI",
          content: "Next.js product using structured OpenAI outputs, Prisma, Stripe, and admin controls.",
          tags: ["nextjs", "ai-product"],
          confidence: "INFERRED",
        },
      ] as CandidateEvidence[],
    });

    expect(draft.message).toContain("Hi Alex,");
    expect(draft.message).toContain("Senior Frontend Engineer");
    expect(draft.message).toContain("WebAuthn Core");
    expect(draft.message).not.toContain("—");
    expect(draft.evidenceRefs).toEqual(["ev1", "ev2"]);
    expect(reviewRecruiterMessage(draft.message, draft.evidenceRefs).status).toBe("PASS");
  });

  it("flags generic or unsupported outreach drafts", () => {
    const review = reviewRecruiterMessage("I am excited to apply — this is cutting-edge.", []);
    expect(review.status).toBe("NEEDS_REVIEW");
    expect(review.warnings).toContain("No evidence references are attached to this outreach draft.");
    expect(review.styleViolations).toEqual(expect.arrayContaining(["Uses an em dash.", "Uses hype language."]));
  });
});
