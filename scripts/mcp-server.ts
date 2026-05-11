#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { syncGithubRepositories } from "../src/lib/github/context";
import { prepareApplicationPackage } from "../src/lib/applications/prepare-package";
import { runJobSearch } from "../src/lib/job-search/ingest";
import { prisma } from "../src/lib/prisma";

const server = new McpServer({
  name: "job-search-os",
  version: "0.1.0",
});

const JobMatchStatus = z.enum([
  "discovered",
  "needs_review",
  "approved",
  "rejected",
  "saved_for_later",
  "resume_generated",
  "cover_letter_generated",
  "ready_to_apply",
  "applied",
  "follow_up_due",
  "screening",
  "interviewing",
  "rejected_by_company",
  "offer",
  "archived",
]);

server.registerTool(
  "get_dashboard_summary",
  {
    title: "Get dashboard summary",
    description: "Return profile, review queue, application, and latest run counts for the Job Search OS.",
    inputSchema: {},
  },
  async () => {
    const [profiles, matches, applications, latestRun] = await Promise.all([
      prisma.jobSearchProfile.findMany({ orderBy: { name: "asc" } }),
      prisma.jobProfileMatch.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.jobSearchRun.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    return jsonResult({
      profiles: {
        total: profiles.length,
        enabled: profiles.filter((profile) => profile.enabled).length,
        names: profiles.map((profile) => profile.name),
      },
      matchesByStatus: Object.fromEntries(matches.map((item) => [item.status, item._count._all])),
      applicationsByStatus: Object.fromEntries(applications.map((item) => [item.status, item._count._all])),
      latestRun,
    });
  },
);

server.registerTool(
  "run_job_search",
  {
    title: "Run job search",
    description: "Start or run the scheduled job ingestion pipeline across enabled profiles and sources.",
    inputSchema: {
      waitForCompletion: z.boolean().default(false).describe("If true, wait for the run to finish before returning."),
    },
  },
  async ({ waitForCompletion }) => {
    const profiles = await prisma.jobSearchProfile.findMany({ where: { enabled: true }, select: { id: true } });
    const run = await prisma.jobSearchRun.create({
      data: {
        status: "running",
        triggeredBy: "manual",
        profileIds: profiles.map((profile) => profile.id) as Prisma.InputJsonValue,
        progress: [{ at: new Date().toISOString(), message: "MCP job search queued." }] as Prisma.InputJsonValue,
      },
    });

    if (waitForCompletion) {
      const completed = await runJobSearch("manual", run.id);
      return jsonResult({ runId: completed.id, status: completed.status, run: completed });
    }

    void runJobSearch("manual", run.id).catch(async (error) => {
      await prisma.jobSearchRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          errors: [{ message: error instanceof Error ? error.message : "Unknown MCP search failure" }] as Prisma.InputJsonValue,
        },
      });
    });

    return jsonResult({
      runId: run.id,
      status: run.status,
      message: "Search started. Poll get_search_run for progress.",
    });
  },
);

server.registerTool(
  "get_search_run",
  {
    title: "Get search run",
    description: "Return run status, stats, progress messages, and errors for a job search run.",
    inputSchema: {
      runId: z.string().optional().describe("Specific run id. If omitted, returns the latest run."),
    },
  },
  async ({ runId }) => {
    const run = runId
      ? await prisma.jobSearchRun.findUnique({ where: { id: runId } })
      : await prisma.jobSearchRun.findFirst({ orderBy: { createdAt: "desc" } });

    if (!run) return jsonResult({ error: "Run not found." }, true);
    return jsonResult(run);
  },
);

server.registerTool(
  "list_review_queue",
  {
    title: "List review queue",
    description: "List jobs that need review, sorted by match score.",
    inputSchema: {
      limit: z.number().int().min(1).max(100).default(25),
      minimumScore: z.number().int().min(0).max(100).default(0),
      profileId: z.string().optional(),
    },
  },
  async ({ limit, minimumScore, profileId }) => {
    const matches = await prisma.jobProfileMatch.findMany({
      where: {
        status: "needs_review",
        overallScore: { gte: minimumScore },
        ...(profileId ? { jobSearchProfileId: profileId } : {}),
      },
      include: {
        jobPosting: { include: { source: true } },
        jobSearchProfile: { select: { id: true, name: true } },
      },
      orderBy: [{ overallScore: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return jsonResult(matches.map(formatMatch));
  },
);

server.registerTool(
  "list_jobs",
  {
    title: "List jobs",
    description: "List known jobs with optional status, score, company, location, and profile filters.",
    inputSchema: {
      status: JobMatchStatus.optional(),
      company: z.string().optional(),
      location: z.string().optional(),
      profileId: z.string().optional(),
      minimumScore: z.number().int().min(0).max(100).default(0),
      limit: z.number().int().min(1).max(100).default(25),
    },
  },
  async ({ status, company, location, profileId, minimumScore, limit }) => {
    const matches = await prisma.jobProfileMatch.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(profileId ? { jobSearchProfileId: profileId } : {}),
        overallScore: { gte: minimumScore },
        jobPosting: {
          ...(company ? { company: { contains: company, mode: "insensitive" } } : {}),
          ...(location ? { location: { contains: location, mode: "insensitive" } } : {}),
        },
      },
      include: {
        jobPosting: { include: { source: true } },
        jobSearchProfile: { select: { id: true, name: true } },
      },
      orderBy: [{ overallScore: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    return jsonResult(matches.map(formatMatch));
  },
);

server.registerTool(
  "get_job_detail",
  {
    title: "Get job detail",
    description: "Get full job details, match explanations, generated materials, and applications for a job.",
    inputSchema: {
      jobId: z.string(),
    },
  },
  async ({ jobId }) => {
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        applications: { include: { resume: true, coverLetter: true }, orderBy: { updatedAt: "desc" } },
        coverLetters: { orderBy: { createdAt: "desc" }, take: 3 },
        matches: { include: { jobSearchProfile: { select: { id: true, name: true } } }, orderBy: { overallScore: "desc" } },
        resumes: { orderBy: { createdAt: "desc" }, take: 3 },
        source: true,
      },
    });

    if (!job) return jsonResult({ error: "Job not found." }, true);
    return jsonResult(job);
  },
);

server.registerTool(
  "set_job_match_status",
  {
    title: "Set job match status",
    description: "Approve, reject, save, archive, or otherwise update a profile-specific job match status.",
    inputSchema: {
      matchId: z.string(),
      status: JobMatchStatus,
      note: z.string().optional(),
    },
  },
  async ({ matchId, status, note }) => {
    const match = await prisma.jobProfileMatch.update({
      where: { id: matchId },
      data: { status, reviewedAt: new Date() },
      include: { jobPosting: true, jobSearchProfile: { select: { id: true, name: true } } },
    });

    if (note) {
      const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
      if (user) {
        const application = await prisma.application.findFirst({
          where: { userId: user.id, jobPostingId: match.jobPostingId },
        });
        if (application) {
          await prisma.applicationEvent.create({
            data: { applicationId: application.id, type: "note_added", payload: { note, source: "mcp" } as Prisma.InputJsonValue },
          });
        }
      }
    }

    return jsonResult({ match: formatMatch(match) });
  },
);

server.registerTool(
  "prepare_application_package",
  {
    title: "Prepare application package",
    description: "Generate/reuse tailored resume and cover letter, create a ready_to_apply application, and keep manual submission required.",
    inputSchema: {
      jobId: z.string(),
      appUrl: z.string().url().optional().describe("Dashboard URL. Defaults to JOB_SEARCH_OS_APP_URL or http://localhost:3000."),
    },
  },
  async ({ jobId, appUrl }) => {
    const baseUrl = appUrl ?? process.env.JOB_SEARCH_OS_APP_URL ?? "http://localhost:3000";
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/jobs/${encodeURIComponent(jobId)}/prepare-application`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonResult({ error: payload.error ?? `Dashboard returned ${response.status}` }, true);
    }

    return jsonResult({
      ...payload,
      manualSubmissionRequired: true,
      safety: "MCP can prepare materials and mark ready_to_apply, but it must not submit applications.",
    });
  },
);

server.registerTool(
  "bulk_prepare_application_packages",
  {
    title: "Bulk prepare application packages",
    description: "Generate/reuse tailored resumes and cover letters for top scoring matches. Applications remain manual-submit only.",
    inputSchema: {
      minimumScore: z.number().int().min(0).max(100).default(85),
      limit: z.number().int().min(1).max(50).default(10),
      profileId: z.string().optional(),
    },
  },
  async ({ minimumScore, limit, profileId }) => {
    const matches = await prisma.jobProfileMatch.findMany({
      where: {
        status: { in: ["needs_review", "approved", "resume_generated", "cover_letter_generated"] },
        overallScore: { gte: minimumScore },
        ...(profileId ? { jobSearchProfileId: profileId } : {}),
        jobPosting: { applicationUrl: { not: null } },
      },
      include: {
        jobPosting: { select: { id: true, company: true, title: true } },
        jobSearchProfile: { select: { id: true, name: true } },
      },
      orderBy: [{ overallScore: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    const results = [];
    for (const match of matches) {
      try {
        const prepared = await prepareApplicationPackage(match.jobPostingId);
        results.push({
          ok: true,
          matchId: match.id,
          jobId: match.jobPostingId,
          company: match.jobPosting.company,
          title: match.jobPosting.title,
          score: match.overallScore,
          profile: match.jobSearchProfile.name,
          applicationId: prepared.application.id,
          resumeId: prepared.resume.id,
          coverLetterId: prepared.coverLetter.id,
        });
      } catch (error) {
        results.push({
          ok: false,
          matchId: match.id,
          jobId: match.jobPostingId,
          company: match.jobPosting.company,
          title: match.jobPosting.title,
          score: match.overallScore,
          profile: match.jobSearchProfile.name,
          error: error instanceof Error ? error.message : "Unknown preparation failure",
        });
      }
    }

    return jsonResult({
      minimumScore,
      eligible: matches.length,
      prepared: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      manualSubmissionRequired: true,
      results,
    });
  },
);

server.registerTool(
  "list_applications",
  {
    title: "List applications",
    description: "List tracked applications with job and generated material status.",
    inputSchema: {
      status: JobMatchStatus.optional(),
      limit: z.number().int().min(1).max(100).default(50),
    },
  },
  async ({ status, limit }) => {
    const applications = await prisma.application.findMany({
      where: status ? { status } : {},
      include: { coverLetter: true, jobPosting: true, resume: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return jsonResult(
      applications.map((application) => ({
        id: application.id,
        status: application.status,
        company: application.jobPosting.company,
        title: application.jobPosting.title,
        applicationUrl: application.jobPosting.applicationUrl,
        hasResume: Boolean(application.resume),
        hasCoverLetter: Boolean(application.coverLetter),
        followUpAt: application.followUpAt,
        updatedAt: application.updatedAt,
      })),
    );
  },
);

server.registerTool(
  "update_application_status",
  {
    title: "Update application status",
    description: "Update an application status and append a status_changed event.",
    inputSchema: {
      applicationId: z.string(),
      status: JobMatchStatus,
      note: z.string().optional(),
      followUpAt: z.string().datetime().optional(),
    },
  },
  async ({ applicationId, status, note, followUpAt }) => {
    const application = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        ...(status === "applied" ? { appliedAt: new Date() } : {}),
        ...(followUpAt ? { followUpAt: new Date(followUpAt) } : {}),
      },
      include: { jobPosting: true },
    });

    await prisma.applicationEvent.create({
      data: {
        applicationId,
        type: "status_changed",
        payload: { status, note, followUpAt, source: "mcp" } as Prisma.InputJsonValue,
      },
    });

    return jsonResult(application);
  },
);

server.registerTool(
  "sync_github_context",
  {
    title: "Sync GitHub context",
    description: "Sync public GitHub repositories into the candidate profile for resume and cover-letter context.",
    inputSchema: {
      githubUrl: z.string().optional().describe("GitHub profile URL or username. Defaults to the saved user profile GitHub URL."),
    },
  },
  async ({ githubUrl }) => {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonResult({ error: "No user profile exists." }, true);

    const url = githubUrl ?? profile.githubUrl;
    if (!url) return jsonResult({ error: "No GitHub URL is configured." }, true);

    const result = await syncGithubRepositories(profile.id, url);
    return jsonResult({
      username: result.username,
      count: result.count,
      repositories: result.repositories.map((repo) => ({
        name: repo.name,
        fullName: repo.fullName,
        htmlUrl: repo.htmlUrl,
        description: repo.description,
        language: repo.language,
        pushedAt: repo.pushedAt,
      })),
    });
  },
);

server.registerTool(
  "get_candidate_profile",
  {
    title: "Get candidate profile",
    description: "Return the approved candidate profile, verified bullet count, work history count, project count, and GitHub context.",
    inputSchema: {},
  },
  async () => {
    const profile = await prisma.userProfile.findFirst({
      include: {
        experienceBullets: { where: { truthLevel: "verified" }, take: 100 },
        githubRepositories: { orderBy: [{ pushedAt: "desc" }, { stars: "desc" }], take: 30 },
        projects: { take: 50 },
        workExperiences: { take: 50 },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!profile) return jsonResult({ error: "No candidate profile exists." }, true);
    return jsonResult({
      id: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
      yearsExperience: profile.yearsExperience,
      professionalSummary: profile.professionalSummary ?? profile.masterSummary,
      coreSkills: profile.coreSkills,
      technicalSkills: profile.technicalSkills,
      workExperienceCount: profile.workExperiences.length,
      verifiedBulletCount: profile.experienceBullets.length,
      projectCount: profile.projects.length,
      githubRepositories: profile.githubRepositories,
    });
  },
);

function formatMatch(match: {
  id: string;
  status: string;
  overallScore: number;
  titleFit: number;
  skillFit: number;
  remoteFit: number;
  compensationFit: number;
  strongestMatches: Prisma.JsonValue;
  concerns: Prisma.JsonValue;
  missingKeywords: Prisma.JsonValue;
  recommendedAction: string;
  aiExplanation: string;
  jobPosting: {
    id: string;
    company: string;
    title: string;
    location: string | null;
    remoteType: string;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    applicationUrl: string | null;
    source?: { name: string; type: string } | null;
  };
  jobSearchProfile: { id: string; name: string };
}) {
  return {
    matchId: match.id,
    jobId: match.jobPosting.id,
    status: match.status,
    score: match.overallScore,
    company: match.jobPosting.company,
    title: match.jobPosting.title,
    location: match.jobPosting.location,
    remoteType: match.jobPosting.remoteType,
    salary: {
      min: match.jobPosting.salaryMin,
      max: match.jobPosting.salaryMax,
      currency: match.jobPosting.salaryCurrency,
    },
    profile: match.jobSearchProfile,
    source: match.jobPosting.source,
    applicationUrl: match.jobPosting.applicationUrl,
    scoreBreakdown: {
      titleFit: match.titleFit,
      skillFit: match.skillFit,
      remoteFit: match.remoteFit,
      compensationFit: match.compensationFit,
    },
    strongestMatches: match.strongestMatches,
    concerns: match.concerns,
    missingKeywords: match.missingKeywords,
    recommendedAction: match.recommendedAction,
    explanation: match.aiExplanation,
  };
}

function jsonResult(value: unknown, isError = false) {
  return {
    isError,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Job Search OS MCP server running on stdio.");
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});
