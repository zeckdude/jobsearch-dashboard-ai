import type { Application, CandidateEvidence, GeneratedCoverLetter, GeneratedResume, JobPosting, JobProfileMatch } from "@prisma/client";
import { runAgent } from "@/lib/agents/run-agent";
import { isBroadResumeEvidence, retrieveCandidateEvidence } from "@/lib/evidence/retrieval";
import { jsonArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";

export type InterviewPrepInput = {
  applicationId: string;
  userId?: string;
};

export type InterviewPrepOutput = {
  applicationId: string;
  company: string;
  role: string;
  positioning: string;
  likelyThemes: string[];
  evidenceStories: Array<{
    title: string;
    evidenceRef: string;
    talkingPoint: string;
  }>;
  risksToPrepare: string[];
  questionsToAsk: string[];
  followUpFocus: string[];
  confidence: number;
  reasoningSummary: string;
};

type ApplicationWithPacket = Application & {
  coverLetter: GeneratedCoverLetter | null;
  jobPosting: JobPosting;
  jobProfileMatch: JobProfileMatch | null;
  resume: GeneratedResume | null;
};

export async function runInterviewPrepAgent(input: InterviewPrepInput) {
  return runAgent<InterviewPrepInput, InterviewPrepOutput>({
    agentType: "INTERVIEW_PREP",
    input,
    userId: input.userId,
    execute: async () => {
      const application = await prisma.application.findUnique({
        where: { id: input.applicationId },
        include: {
          coverLetter: true,
          jobPosting: true,
          jobProfileMatch: true,
          resume: true,
          user: { include: { profile: { select: { id: true } } } },
        },
      });
      if (!application) throw new Error("Application not found.");

      const evidence = application.user.profile
        ? await retrieveCandidateEvidence({
            candidateProfileId: application.user.profile.id,
            query: `${application.jobPosting.title} ${application.jobPosting.company} ${application.jobPosting.description}`,
            confidenceMinimum: "INFERRED",
            usableFor: "resume",
            limit: 8,
          })
        : [];

      return buildInterviewPrep(application, evidence);
    },
  });
}

export function buildInterviewPrep(application: ApplicationWithPacket, evidence: CandidateEvidence[]): InterviewPrepOutput {
  const jobText = `${application.jobPosting.title} ${application.jobPosting.description}`.toLowerCase();
  const resumeNotes = objectValue(application.resume?.generationNotes);
  const strategy = objectValue(resumeNotes.resumeStrategy);
  const emphasisTags = jsonArray(strategy.emphasisTags);
  const likelyThemes = inferThemes(jobText, emphasisTags);
  const focusedEvidence = preferFocusedInterviewEvidence(evidence);
  const evidenceStories = focusedEvidence.slice(0, 5).map((item) => ({
    title: item.title,
    evidenceRef: item.id,
    talkingPoint: talkingPointForEvidence(item, application.jobPosting),
  }));
  const risksToPrepare = inferRisks(jobText, application.jobProfileMatch, focusedEvidence.length);
  const questionsToAsk = buildQuestions(application.jobPosting, likelyThemes);

  return {
    applicationId: application.id,
    company: application.jobPosting.company,
    role: application.jobPosting.title,
    positioning: typeof strategy.positioningSummary === "string"
      ? strategy.positioningSummary
      : `Position as a credible match for ${application.jobPosting.company}'s ${application.jobPosting.title} role using approved evidence only.`,
    likelyThemes,
    evidenceStories,
    risksToPrepare,
    questionsToAsk,
    followUpFocus: [
      "Clarify the team's current priorities and success criteria for the role.",
      "Map answers back to approved projects and experience, not unsupported claims.",
      "After the conversation, update application status and add any useful interview notes as evidence.",
    ],
    confidence: focusedEvidence.length >= 5 ? 0.82 : focusedEvidence.length >= 2 ? 0.68 : 0.52,
    reasoningSummary: "Built interview prep from the job description, saved application packet strategy, match concerns, and approved candidate evidence.",
  };
}

export function preferFocusedInterviewEvidence(evidence: CandidateEvidence[]) {
  const uniqueEvidence = dedupeEvidenceForInterview(evidence);
  const focused = uniqueEvidence.filter((item) => !isBroadResumeEvidence(item));
  return focused.length >= 2 ? focused : uniqueEvidence;
}

function dedupeEvidenceForInterview(evidence: CandidateEvidence[]) {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.title.toLowerCase().trim()}|${item.content.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 500)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferThemes(jobText: string, emphasisTags: string[]) {
  const themes = new Set<string>();
  const tagText = emphasisTags.join(" ").toLowerCase();
  const text = `${jobText} ${tagText}`;

  if (/\breact|frontend|ui|web\b/.test(text)) themes.add("React/TypeScript product UI depth");
  if (/\bdesign system|storybook|component library|frontend platform\b/.test(text)) themes.add("design systems and frontend platform quality");
  if (/\bsecurity|identity|auth|webauthn|passkey|compliance\b/.test(text)) themes.add("security, identity, and authentication workflows");
  if (/\bai|llm|agent|openai|automation\b/.test(text)) themes.add("AI product workflows with human review");
  if (/\bdata|dashboard|analytics|visualization|reporting\b/.test(text)) themes.add("data-rich dashboards and visualization");
  if (/\bfull stack|api|node|postgres|backend\b/.test(text)) themes.add("full-stack product delivery");
  if (themes.size === 0) themes.add("senior product engineering judgment");

  return Array.from(themes).slice(0, 6);
}

function inferRisks(jobText: string, match: JobProfileMatch | null, evidenceCount: number) {
  const risks = jsonArray(match?.concerns).slice(0, 4);
  if (evidenceCount === 0) risks.push("No approved evidence was retrieved for interview prep.");
  if (/\b(kubernetes|terraform|go|rust|machine learning research|ml research)\b/i.test(jobText)) {
    risks.push("Prepare a truthful boundary around infrastructure or ML depth if asked.");
  }
  if (/\bmanager|people management|lead a team\b/i.test(jobText)) {
    risks.push("Be precise about leadership scope and avoid implying unsupported people-management experience.");
  }
  return Array.from(new Set(risks)).slice(0, 6);
}

function buildQuestions(job: Pick<JobPosting, "company" | "title" | "description">, themes: string[]) {
  const questions = [
    `What would make someone successful in the ${job.title} role during the first 90 days?`,
    `Which product or platform problems are most important for ${job.company} to solve this quarter?`,
  ];
  if (themes.some((theme) => /design systems|frontend platform/i.test(theme))) {
    questions.push("How does the team balance design-system consistency with product-team speed?");
  }
  if (themes.some((theme) => /security|identity|authentication/i.test(theme))) {
    questions.push("Where are the hardest UX tradeoffs in the current authentication or security workflows?");
  }
  if (themes.some((theme) => /AI/i.test(theme))) {
    questions.push("How does the team evaluate AI output quality and keep humans in control of critical decisions?");
  }
  questions.push("What signals would tell you this hire is raising the quality bar for the team?");
  return questions.slice(0, 6);
}

function talkingPointForEvidence(evidence: Pick<CandidateEvidence, "title" | "content" | "tags">, job: Pick<JobPosting, "title" | "company">) {
  const shortContent = evidence.content.length > 180 ? `${evidence.content.slice(0, 177)}...` : evidence.content;
  const tags = jsonArray(evidence.tags).slice(0, 4);
  return `${shortContent}${tags.length ? ` Signals: ${tags.join(", ")}.` : ""} Tie this back to ${job.company}'s ${job.title} needs only if the interviewer asks about this area.`;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
