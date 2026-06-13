import { prisma } from "@/lib/prisma";

export type SetupCheckResult = {
  key: string;
  label: string;
  passed: boolean;
  message?: string;
};

export type SetupStatus = {
  allPassed: boolean;
  checks: SetupCheckResult[];
};

export async function runSetupCheck(userId: string): Promise<SetupStatus> {
  const [resumeUpload, userProfile, searchProfiles, jobSources] = await Promise.all([
    prisma.resumeUpload.findFirst({
      where: { userId, parsingStatus: "approved" },
      select: { id: true },
    }),
    prisma.userProfile.findFirst({
      where: { userId },
      select: { masterSummary: true },
    }),
    prisma.jobSearchProfile.findFirst({
      where: { userId, enabled: true },
      select: { id: true },
    }),
    prisma.jobSource.findFirst({
      where: { enabled: true },
      select: { id: true },
    }),
  ]);

  const checks: SetupCheckResult[] = [
    {
      key: "setup-resume",
      label: "Resume uploaded",
      passed: !!resumeUpload,
      message: resumeUpload ? undefined : "Upload a resume PDF or Word file so the system can parse your work history.",    },
    {
      key: "setup-profile",
      label: "Candidate profile filled",
      passed: !!(userProfile?.masterSummary),
      message: userProfile?.masterSummary ? undefined : "Fill in your master summary and LinkedIn URL.",
    },
    {
      key: "setup-search-profiles",
      label: "Search profile enabled",
      passed: !!searchProfiles,
      message: searchProfiles ? undefined : "Create and enable at least one search profile.",
    },
    {
      key: "setup-sources",
      label: "Job source enabled",
      passed: !!jobSources,
      message: jobSources ? undefined : "Enable at least one job source.",
    },
  ];

  // OpenAI key check — env var presence only (no network call in the lib)
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  checks.push({
    key: "setup-openai",
    label: "OpenAI API key configured",
    passed: hasOpenAI,
    message: hasOpenAI ? undefined : "Add your OPENAI_API_KEY to .env (local) or Vercel environment variables (production).",
  });

  return {
    allPassed: checks.every((c) => c.passed),
    checks,
  };
}
