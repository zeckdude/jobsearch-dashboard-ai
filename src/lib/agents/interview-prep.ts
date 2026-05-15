import type { Application, CandidateEvidence, GeneratedCoverLetter, GeneratedResume, JobPosting, JobProfileMatch } from "@prisma/client";
import type { CompanyResearchOutput } from "@/lib/agents/company-research";
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
  likelyStages: string[];
  likelyAssessments: string[];
  risksToPrepare: string[];
  questionsToAsk: string[];
  followUpFocus: string[];
  sourceNotes: string[];
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
      const companyResearchRun = await prisma.agentRun.findFirst({
        where: {
          agentType: "COMPANY_RESEARCH",
          status: "COMPLETED",
          inputJson: {
            path: ["applicationId"],
            equals: input.applicationId,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return buildInterviewPrep(application, evidence, companyResearchOutput(companyResearchRun?.outputJson));
    },
  });
}

export function buildInterviewPrep(application: ApplicationWithPacket, evidence: CandidateEvidence[], companyResearch: CompanyResearchOutput | null = null): InterviewPrepOutput {
  const jobText = `${application.jobPosting.title} ${application.jobPosting.description}`.toLowerCase();
  const resumeNotes = objectValue(application.resume?.generationNotes);
  const strategy = objectValue(resumeNotes.resumeStrategy);
  const emphasisTags = jsonArray(strategy.emphasisTags);
  const likelyThemes = mergeUnique(inferThemes(jobText, emphasisTags), companyResearch?.roleThemes ?? []).slice(0, 6);
  const focusedEvidence = preferFocusedInterviewEvidence(evidence);
  const evidenceStories = focusedEvidence.slice(0, 5).map((item) => ({
    title: item.title,
    evidenceRef: item.id,
    talkingPoint: talkingPointForEvidence(item, application.jobPosting),
  }));
  const likelyStages = inferLikelyStages(jobText, companyResearch);
  const likelyAssessments = inferLikelyAssessments(jobText, likelyThemes, companyResearch);
  const risksToPrepare = mergeUnique(inferRisks(jobText, application.jobProfileMatch, focusedEvidence.length), companyResearch?.risks ?? []).slice(0, 6);
  const questionsToAsk = mergeUnique(buildQuestions(application.jobPosting, likelyThemes), companyResearch?.questionsToAnswer ?? []).slice(0, 8);
  const sourceNotes = buildPrepSourceNotes(companyResearch);

  return {
    applicationId: application.id,
    company: application.jobPosting.company,
    role: application.jobPosting.title,
    positioning: typeof strategy.positioningSummary === "string"
      ? strategy.positioningSummary
      : `Position as a credible match for ${application.jobPosting.company}'s ${application.jobPosting.title} role using approved evidence only.`,
    likelyThemes,
    evidenceStories,
    likelyStages,
    likelyAssessments,
    risksToPrepare,
    questionsToAsk,
    followUpFocus: [
      "Clarify the team's current priorities and success criteria for the role.",
      "Map answers back to approved projects and experience, not unsupported claims.",
      "After the conversation, update application status and add any useful interview notes as evidence.",
    ],
    sourceNotes,
    confidence: prepConfidence(focusedEvidence.length, companyResearch?.confidence),
    reasoningSummary: companyResearch
      ? "Built interview prep from the job description, saved company research, packet strategy, match concerns, and approved candidate evidence. No unsupported external claims were introduced."
      : "Built interview prep from the job description, saved application packet strategy, match concerns, and approved candidate evidence.",
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

function inferLikelyStages(jobText: string, companyResearch: CompanyResearchOutput | null) {
  const stages = new Set<string>();
  stages.add("Recruiter screen focused on role fit, logistics, compensation, and timing.");
  stages.add("Hiring-manager or team screen focused on product judgment, technical depth, and collaboration.");
  if (/\btechnical interview|coding|pair programming|take.?home|assessment\b/i.test(jobText)) {
    stages.add("Technical assessment or coding conversation based on the job description.");
  }
  if (/\bsystem design|architecture|platform|staff|principal\b/i.test(jobText)) {
    stages.add("Architecture or frontend-system design discussion.");
  }
  if (/\bdesign system|designer|product manager|cross-functional\b/i.test(jobText)) {
    stages.add("Cross-functional product/design discussion.");
  }
  for (const note of companyResearch?.sourceNotes ?? []) {
    if (/company source|ats provider|application url/i.test(note)) continue;
    stages.add(note);
  }
  return Array.from(stages).slice(0, 6);
}

function inferLikelyAssessments(jobText: string, themes: string[], companyResearch: CompanyResearchOutput | null) {
  const assessments = new Set<string>();
  if (/\breact|frontend|ui|web\b/i.test(jobText)) assessments.add("React/TypeScript UI implementation or debugging exercise.");
  if (/\bdesign system|storybook|component\b/i.test(jobText)) assessments.add("Component architecture, accessibility, and design-system tradeoffs.");
  if (/\bfull.?stack|api|node|postgres\b/i.test(jobText)) assessments.add("Full-stack product flow discussion covering API and data modeling choices.");
  if (/\bsecurity|identity|auth|webauthn|passkey\b/i.test(jobText)) assessments.add("Authentication/security UX scenario and truthful depth boundaries.");
  if (/\bai|llm|agent|automation\b/i.test(jobText)) assessments.add("AI workflow quality, evaluation, and human-review discussion.");
  for (const theme of themes) assessments.add(`Prepare examples for ${theme}.`);
  for (const need of companyResearch?.likelyTeamNeeds ?? []) assessments.add(`Discuss how you would help the team ${need}.`);
  if (assessments.size === 0) assessments.add("Senior product-engineering conversation focused on tradeoffs, ownership, and execution.");
  return Array.from(assessments).slice(0, 7);
}

function buildPrepSourceNotes(companyResearch: CompanyResearchOutput | null) {
  const notes = companyResearch?.sourceNotes?.length ? [...companyResearch.sourceNotes] : ["No public company-process source has been saved yet; prep is based on the job description and approved evidence."];
  if (companyResearch?.brief) notes.unshift(companyResearch.brief);
  return notes.slice(0, 6);
}

function prepConfidence(evidenceCount: number, companyConfidence?: number) {
  const evidenceConfidence = evidenceCount >= 5 ? 0.82 : evidenceCount >= 2 ? 0.68 : 0.52;
  return companyConfidence ? Math.min(0.9, (evidenceConfidence + companyConfidence) / 2) : evidenceConfidence;
}

function mergeUnique(first: string[], second: string[]) {
  return Array.from(new Set([...first, ...second].filter(Boolean)));
}

function talkingPointForEvidence(evidence: Pick<CandidateEvidence, "title" | "content" | "tags">, job: Pick<JobPosting, "title" | "company">) {
  const shortContent = evidence.content.length > 180 ? `${evidence.content.slice(0, 177)}...` : evidence.content;
  const tags = jsonArray(evidence.tags).slice(0, 4);
  return `${shortContent}${tags.length ? ` Signals: ${tags.join(", ")}.` : ""} Tie this back to ${job.company}'s ${job.title} needs only if the interviewer asks about this area.`;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function companyResearchOutput(value: unknown): CompanyResearchOutput | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as CompanyResearchOutput : null;
}
