import type { GeneratedCoverLetter, GeneratedResume, Prisma } from "@prisma/client";
import { runApplicationQaAgent } from "@/lib/agents/application-qa";
import { runResumeStrategyAgent, type ResumeStrategyOutput } from "@/lib/agents/resume-strategy";

type StrategyInput = {
  jobPostingId: string;
  jobSearchProfileId: string;
  userId?: string;
};

export async function createResumeStrategy(input: StrategyInput): Promise<ResumeStrategyOutput | null> {
  try {
    const result = await runResumeStrategyAgent(input);
    return result.output;
  } catch (error) {
    console.warn("Resume strategy agent failed.", error);
    return null;
  }
}

export async function attachResumeQa({
  resume,
  userId,
  strategy,
}: {
  resume: GeneratedResume;
  userId?: string;
  strategy?: ResumeStrategyOutput | null;
}) {
  try {
    const qa = await runApplicationQaAgent({
      jobPostingId: resume.jobPostingId,
      userId,
      resumeMarkdown: resume.markdown,
      evidenceRefs: strategy?.evidenceRefs ?? [],
    });
    return {
      qa: qa.output,
      notes: withAgentNotes(resume.generationNotes, { resumeStrategy: strategy, applicationQa: qa.output }),
    };
  } catch (error) {
    console.warn("Resume QA agent failed.", error);
    return {
      qa: null,
      notes: withAgentNotes(resume.generationNotes, { resumeStrategy: strategy, applicationQaError: error instanceof Error ? error.message : "Unknown QA error" }),
    };
  }
}

export async function attachCoverLetterQa({
  coverLetter,
  resumeMarkdown,
  userId,
  strategy,
}: {
  coverLetter: GeneratedCoverLetter;
  resumeMarkdown?: string | null;
  userId?: string;
  strategy?: ResumeStrategyOutput | null;
}) {
  try {
    const qa = await runApplicationQaAgent({
      jobPostingId: coverLetter.jobPostingId,
      userId,
      resumeMarkdown,
      coverLetterBody: coverLetter.body,
      evidenceRefs: strategy?.evidenceRefs ?? [],
    });
    return {
      qa: qa.output,
      notes: withAgentNotes(coverLetter.generationNotes, { resumeStrategy: strategy, applicationQa: qa.output }),
    };
  } catch (error) {
    console.warn("Cover letter QA agent failed.", error);
    return {
      qa: null,
      notes: withAgentNotes(coverLetter.generationNotes, { resumeStrategy: strategy, applicationQaError: error instanceof Error ? error.message : "Unknown QA error" }),
    };
  }
}

export function withAgentNotes(existing: Prisma.JsonValue, updates: Record<string, unknown>) {
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  return {
    ...base,
    ...updates,
  } as Prisma.InputJsonValue;
}
