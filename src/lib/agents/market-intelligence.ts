import type { ApplicationOutcomeType, JobMatchStatus, JobPosting, JobSearchProfile, Prisma, SearchProfilePerformance } from "@prisma/client";
import { runAgent } from "@/lib/agents/run-agent";
import { jsonArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";

export type MarketIntelligenceInput = {
  userId?: string;
  lookbackDays?: number;
};

export type MarketIntelligenceOutput = {
  generatedAt: string;
  lookbackDays: number;
  summary: string;
  marketTemperature: Array<{
    lane: string;
    temperature: "hot" | "warm" | "mixed" | "cool";
    score: number;
    jobCount: number;
    applyNowCount: number;
    callbackRate: number;
    topCompanies: string[];
    rationale: string;
  }>;
  skillSignals: Array<{
    skill: string;
    status: "rising" | "stable" | "noisy";
    mentions: number;
    lanes: string[];
    guidance: string;
  }>;
  recommendedActions: Array<{
    priority: 1 | 2 | 3;
    category: "search_profile" | "positioning" | "company_targeting" | "outreach";
    title: string;
    detail: string;
    reviewOnly: true;
  }>;
  sourceDigest: Array<{
    title: string;
    publisher: string;
    url: string;
    status: "checked" | "unverified";
    signal: string;
  }>;
  chartData: {
    laneDemand: Array<{ label: string; value: number }>;
    skillDemand: Array<{ label: string; value: number }>;
    profileHealth: Array<{ label: string; value: number }>;
  };
  dataFreshness: {
    internalJobsAnalyzed: number;
    applicationsAnalyzed: number;
    profilesAnalyzed: number;
    externalSourcesChecked: number;
  };
  confidence: number;
};

type SourceStatus = "checked" | "unverified";

type MarketSource = {
  title: string;
  publisher: string;
  url: string;
  signal: string;
};

type ProfileForMarket = JobSearchProfile & {
  performanceSnapshots: SearchProfilePerformance[];
};

type MatchForMarket = {
  status: JobMatchStatus;
  overallScore: number;
  jobSearchProfileId: string;
  jobPosting: Pick<JobPosting, "id" | "company" | "title" | "description" | "requirements" | "niceToHaves" | "lastSeenAt"> & {
    evaluations: Array<{ recommendedAction: string; fitScore: number; opportunityScore: number }>;
    applications: Array<{
      status: JobMatchStatus;
      outcomes: Array<{ outcome: ApplicationOutcomeType }>;
    }>;
  };
};

type BuildInput = {
  profiles: ProfileForMarket[];
  matches: MatchForMarket[];
  candidateTerms: string[];
  sources: Array<MarketSource & { status: SourceStatus }>;
  lookbackDays: number;
  generatedAt?: Date;
};

const marketSources: MarketSource[] = [
  {
    title: "Software Developers, Quality Assurance Analysts, and Testers",
    publisher: "U.S. Bureau of Labor Statistics",
    url: "https://www.bls.gov/ooh/Computer-and-Information-Technology/Software-developers.htm",
    signal: "Baseline long-term outlook for software roles; use as context, not a weekly hiring signal.",
  },
  {
    title: "Indeed Hiring Lab",
    publisher: "Indeed Hiring Lab",
    url: "https://www.hiringlab.org/",
    signal: "Near-real-time posting and labor-market snapshots for tech and knowledge-work hiring.",
  },
  {
    title: "Four Takeaways from the 2026 Stanford AI Index",
    publisher: "Lightcast",
    url: "https://lightcast.io/resources/blog/stanford-ai-2026",
    signal: "AI-skill demand and posting shifts; useful for AI product, agentic workflow, and LLM-adjacent positioning.",
  },
  {
    title: "AI jobs on the rise, new LinkedIn report finds",
    publisher: "Axios",
    url: "https://www.axios.com/2025/01/07/ai-jobs-on-the-rise-linkedin-report",
    signal: "Role-title trend context for AI engineer and AI-adjacent product engineering demand.",
  },
];

const laneDefinitions = [
  {
    lane: "AI product/frontend",
    terms: ["ai", "llm", "agent", "rag", "workflow", "automation", "copilot", "machine learning"],
  },
  {
    lane: "Design systems/frontend platform",
    terms: ["design system", "component library", "storybook", "frontend platform", "ui platform", "accessibility"],
  },
  {
    lane: "Enterprise SaaS/product UI",
    terms: ["enterprise", "saas", "dashboard", "analytics", "workflow", "permissions", "admin", "reporting"],
  },
  {
    lane: "Developer tools/platform",
    terms: ["developer tools", "devtools", "platform", "api", "sdk", "infrastructure", "ci/cd", "observability"],
  },
  {
    lane: "Data-rich operations UI",
    terms: ["data", "visualization", "real-time", "operations", "finance", "risk", "marketplace", "intelligence"],
  },
];

const trackedSkills = [
  "React",
  "TypeScript",
  "Next.js",
  "Node.js",
  "AI",
  "LLM",
  "RAG",
  "Agents",
  "LangGraph",
  "MCP",
  "Design Systems",
  "Accessibility",
  "Analytics",
  "Workflow",
  "Observability",
  "Postgres",
];

export async function runMarketIntelligenceAgent(input: MarketIntelligenceInput = {}) {
  const lookbackDays = input.lookbackDays ?? 45;
  return runAgent<MarketIntelligenceInput, MarketIntelligenceOutput>({
    agentType: "MARKET_INTELLIGENCE",
    input: { ...input, lookbackDays },
    userId: input.userId,
    execute: async () => {
      const since = new Date(Date.now() - lookbackDays * 86_400_000);
      const [profiles, matches, candidateProfile, sources] = await Promise.all([
        prisma.jobSearchProfile.findMany({
          where: input.userId ? { userId: input.userId } : undefined,
          include: { performanceSnapshots: { orderBy: { lastEvaluatedAt: "desc" }, take: 1 } },
          orderBy: [{ enabled: "desc" }, { name: "asc" }],
        }),
        prisma.jobProfileMatch.findMany({
          where: {
            createdAt: { gte: since },
            ...(input.userId ? { jobSearchProfile: { userId: input.userId } } : {}),
          },
          include: {
            jobPosting: {
              select: {
                id: true,
                company: true,
                title: true,
                description: true,
                requirements: true,
                niceToHaves: true,
                lastSeenAt: true,
                evaluations: {
                  select: { recommendedAction: true, fitScore: true, opportunityScore: true },
                  orderBy: { updatedAt: "desc" },
                  take: 1,
                },
                applications: {
                  select: {
                    status: true,
                    outcomes: {
                      select: { outcome: true },
                      orderBy: { occurredAt: "desc" },
                      take: 1,
                    },
                  },
                  take: 5,
                },
              },
            },
          },
          orderBy: [{ overallScore: "desc" }, { updatedAt: "desc" }],
          take: 500,
        }),
        prisma.userProfile.findFirst({
          where: input.userId ? { userId: input.userId } : undefined,
          include: {
            projects: true,
            workExperiences: true,
            experienceBullets: true,
          },
          orderBy: { createdAt: "asc" },
        }),
        checkMarketSources(),
      ]);

      return buildMarketIntelligenceReport({
        profiles,
        matches,
        candidateTerms: candidateTerms(candidateProfile),
        sources,
        lookbackDays,
      });
    },
  });
}

export function buildMarketIntelligenceReport(input: BuildInput): MarketIntelligenceOutput {
  const generatedAt = input.generatedAt ?? new Date();
  const laneStats = laneDefinitions
    .map((definition) => laneStat(definition, input.matches))
    .sort((left, right) => right.score - left.score || right.jobCount - left.jobCount || left.lane.localeCompare(right.lane));
  const skillSignals = buildSkillSignals(input.matches, input.candidateTerms);
  const recommendedActions = buildRecommendedActions(laneStats, skillSignals, input.profiles);
  const topLane = laneStats[0];
  const summary = topLane
    ? `${topLane.lane} is the strongest current lane in your recent data with ${topLane.jobCount} matching role(s), ${topLane.applyNowCount} apply-now signal(s), and a ${topLane.callbackRate}% callback rate. Use external sources as context, but prioritize lanes that also show up in your own pipeline.`
    : "There is not enough recent local job data yet. Run discovery, then rerun market intelligence to compare market signals against your actual search pipeline.";

  return {
    generatedAt: generatedAt.toISOString(),
    lookbackDays: input.lookbackDays,
    summary,
    marketTemperature: laneStats,
    skillSignals,
    recommendedActions,
    sourceDigest: input.sources,
    chartData: {
      laneDemand: laneStats.map((lane) => ({ label: lane.lane, value: lane.jobCount })),
      skillDemand: skillSignals.slice(0, 8).map((skill) => ({ label: skill.skill, value: skill.mentions })),
      profileHealth: input.profiles.slice(0, 8).map((profile) => ({
        label: profile.name,
        value: profile.performanceSnapshots[0]?.healthScore ?? 0,
      })),
    },
    dataFreshness: {
      internalJobsAnalyzed: new Set(input.matches.map((match) => match.jobPosting.id)).size,
      applicationsAnalyzed: input.matches.reduce((count, match) => count + match.jobPosting.applications.length, 0),
      profilesAnalyzed: input.profiles.length,
      externalSourcesChecked: input.sources.filter((source) => source.status === "checked").length,
    },
    confidence: confidenceFor(input.matches.length, input.profiles.length, input.sources.filter((source) => source.status === "checked").length),
  };
}

async function checkMarketSources() {
  return Promise.all(marketSources.map(async (source) => ({
    ...source,
    status: await sourceReachable(source.url),
  })));
}

async function sourceReachable(url: string): Promise<SourceStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    return response.ok ? "checked" : "unverified";
  } catch {
    return "unverified";
  } finally {
    clearTimeout(timeout);
  }
}

function laneStat(definition: typeof laneDefinitions[number], matches: MatchForMarket[]): MarketIntelligenceOutput["marketTemperature"][number] {
  const laneMatches = matches.filter((match) => textHasAny(jobText(match.jobPosting), definition.terms));
  const applyNowCount = laneMatches.filter((match) => match.jobPosting.evaluations[0]?.recommendedAction === "APPLY_NOW" || match.overallScore >= 90).length;
  const applications = laneMatches.flatMap((match) => match.jobPosting.applications);
  const positiveOutcomes = applications.filter((application) => {
    const outcome = application.outcomes[0]?.outcome;
    return outcome === "RECRUITER_SCREEN" || outcome === "TECH_SCREEN" || outcome === "ONSITE" || outcome === "FINAL" || outcome === "OFFER";
  }).length;
  const callbackRate = applications.length ? Math.round((positiveOutcomes / applications.length) * 100) : 0;
  const companies = topValues(laneMatches.map((match) => match.jobPosting.company), 5);
  const score = clamp(Math.round(laneMatches.length * 6 + applyNowCount * 10 + callbackRate * 0.6));
  const temperature = score >= 75 ? "hot" : score >= 52 ? "warm" : laneMatches.length >= 3 ? "mixed" : "cool";

  return {
    lane: definition.lane,
    temperature,
    score,
    jobCount: laneMatches.length,
    applyNowCount,
    callbackRate,
    topCompanies: companies,
    rationale: `${laneMatches.length} recent matching role(s), ${applyNowCount} strong apply signal(s), ${applications.length} application(s), ${callbackRate}% callback rate.`,
  };
}

function buildSkillSignals(matches: MatchForMarket[], candidateTerms: string[]): MarketIntelligenceOutput["skillSignals"] {
  const candidateSet = new Set(candidateTerms.map(normalizeTerm));
  return trackedSkills
    .map((skill) => {
      const normalized = normalizeTerm(skill);
      const matchingLanes = new Set<string>();
      const mentions = matches.filter((match) => {
        const text = jobText(match.jobPosting);
        const hit = text.includes(normalized);
        if (hit) {
          for (const lane of laneDefinitions) {
            if (textHasAny(text, lane.terms)) matchingLanes.add(lane.lane);
          }
        }
        return hit;
      }).length;
      const status: MarketIntelligenceOutput["skillSignals"][number]["status"] = mentions >= 8 ? "rising" : mentions >= 3 ? "stable" : "noisy";
      const hasCandidateSignal = candidateSet.has(normalized);
      return {
        skill,
        status,
        mentions,
        lanes: Array.from(matchingLanes).slice(0, 4),
        guidance: hasCandidateSignal
          ? `${skill} appears in both your profile context and recent postings; keep it visible in positioning and evidence.`
          : `${skill} appears in recent postings but is not prominent in candidate evidence; only add it if truthful and supported.`,
      };
    })
    .filter((signal) => signal.mentions > 0)
    .sort((left, right) => right.mentions - left.mentions || left.skill.localeCompare(right.skill));
}

function buildRecommendedActions(
  lanes: MarketIntelligenceOutput["marketTemperature"],
  skills: MarketIntelligenceOutput["skillSignals"],
  profiles: ProfileForMarket[],
): MarketIntelligenceOutput["recommendedActions"] {
  const actions: MarketIntelligenceOutput["recommendedActions"] = [];
  const topLane = lanes[0];
  const topSkill = skills[0];
  const weakProfiles = profiles.filter((profile) => (profile.performanceSnapshots[0]?.healthScore ?? 100) < 60).slice(0, 2);

  if (topLane) {
    actions.push({
      priority: 1,
      category: "search_profile",
      title: `Prioritize ${topLane.lane}`,
      detail: `Recent data shows ${topLane.jobCount} matching role(s) and ${topLane.applyNowCount} strong apply signal(s). Review profile keywords and source companies for this lane.`,
      reviewOnly: true,
    });
  }
  if (topSkill) {
    actions.push({
      priority: 1,
      category: "positioning",
      title: `Make ${topSkill.skill} evidence easier to see`,
      detail: topSkill.guidance,
      reviewOnly: true,
    });
  }
  for (const profile of weakProfiles) {
    actions.push({
      priority: 2,
      category: "search_profile",
      title: `Review weak profile: ${profile.name}`,
      detail: `Latest health score is ${profile.performanceSnapshots[0]?.healthScore ?? 0}. Tighten noisy keywords, pause stale lanes, or split it into a clearer campaign.`,
      reviewOnly: true,
    });
  }
  if (topLane?.topCompanies.length) {
    actions.push({
      priority: 3,
      category: "outreach",
      title: "Pair applications with targeted outreach",
      detail: `Start with ${topLane.topCompanies.slice(0, 3).join(", ")} because they appear in the strongest current lane.`,
      reviewOnly: true,
    });
  }
  return actions.slice(0, 6);
}

function candidateTerms(profile: { projects?: Array<{ technologies: Prisma.JsonValue; highlights: Prisma.JsonValue }>; workExperiences?: Array<{ skills: Prisma.JsonValue; achievements: Prisma.JsonValue }>; experienceBullets?: Array<{ keywords: Prisma.JsonValue; text: string }> } | null) {
  if (!profile) return [];
  return unique([
    ...profile.projects?.flatMap((project) => [...jsonArray(project.technologies), ...jsonArray(project.highlights)]) ?? [],
    ...profile.workExperiences?.flatMap((experience) => [...jsonArray(experience.skills), ...jsonArray(experience.achievements)]) ?? [],
    ...profile.experienceBullets?.flatMap((bullet) => [...jsonArray(bullet.keywords), bullet.text]) ?? [],
  ]);
}

function jobText(job: Pick<JobPosting, "title" | "company" | "description" | "requirements" | "niceToHaves">) {
  return normalizeTerm([
    job.title,
    job.company,
    job.description,
    ...jsonArray(job.requirements),
    ...jsonArray(job.niceToHaves),
  ].join(" "));
}

function textHasAny(text: string, terms: string[]) {
  const normalized = normalizeTerm(text);
  return terms.some((term) => normalized.includes(normalizeTerm(term)));
}

function topValues(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.+#]+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function confidenceFor(matchCount: number, profileCount: number, checkedSources: number) {
  return Math.min(0.9, Math.max(0.45, 0.35 + Math.min(matchCount, 60) / 150 + Math.min(profileCount, 5) / 20 + checkedSources / 20));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
