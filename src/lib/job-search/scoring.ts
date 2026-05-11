import type { JobSearchProfile } from "@prisma/client";

export type ScoreInput = {
  company: string;
  title: string;
  description: string;
  location?: string | null;
  salaryMin?: number | null;
};

export function scoreJobForProfile(job: ScoreInput, profile: JobSearchProfile) {
  const haystack = [job.title, job.company, job.location ?? "", job.description].join(" ").toLowerCase();
  const titles = stringArray(profile.titles);
  const required = stringArray(profile.keywordsRequired);
  const preferred = stringArray(profile.keywordsPreferred);
  const excluded = stringArray(profile.keywordsExcluded);
  const excludedCompanies = stringArray(profile.excludedCompanies);
  const industries = stringArray(profile.industries);
  const excludedTitles = stringArray(profile.excludedTitles);
  const companyExcludedMatches = excludedCompanies.filter((company) => includesTerm(job.company, company));

  const titleMatches = titles.filter((title) => includesTerm(job.title, title));
  const preferredMatches = preferred.filter((keyword) => includesTerm(haystack, keyword));
  const requiredMatches = required.filter((keyword) => includesTerm(haystack, keyword));
  const industryMatches = industries.filter((industry) => includesTerm(haystack, industry));
  const excludedMatches = [...excluded, ...excludedTitles].filter((keyword) => includesTerm(haystack, keyword));
  const isBlockedCompany = companyExcludedMatches.length > 0;

  const titleFit = isBlockedCompany ? 0 : clamp(45 + titleMatches.length * 25 + (isSenior(job.title) ? 20 : 0) - excludedMatches.length * 25);
  const skillFit = clamp(50 + preferredMatches.length * 8 + requiredMatches.length * 12 - Math.max(0, required.length - requiredMatches.length) * 12);
  const seniorityFit = clamp(isSenior(job.title) ? 88 : 58);
  const industryFit = clamp(55 + industryMatches.length * 12);
  const compensationFit = clamp(job.salaryMin || profile.includeUnknownSalary ? 78 : 45);
  const remoteFit = clamp(remoteScore(haystack, profile.remotePreference));
  const relocationFit = clamp(relocationScore(haystack, profile.relocationPreference));
  const overallScore = isBlockedCompany ? 0 : clamp(
    Math.round(
      titleFit * 0.2 +
        skillFit * 0.25 +
        seniorityFit * 0.15 +
        industryFit * 0.1 +
        compensationFit * 0.1 +
        remoteFit * 0.15 +
        relocationFit * 0.05 -
        excludedMatches.length * 20,
    ),
  );

  const strongestMatches = [...titleMatches, ...preferredMatches, ...industryMatches].slice(0, 8);
  const concerns = [
    ...(companyExcludedMatches.length ? [`Excluded company detected: ${companyExcludedMatches.join(", ")}`] : []),
    ...(excludedMatches.length ? [`Excluded terms detected: ${excludedMatches.join(", ")}`] : []),
    ...(job.salaryMin || profile.includeUnknownSalary ? [] : ["Salary is unknown and this profile excludes unknown salary."]),
    ...(required.length && requiredMatches.length < required.length ? [`Missing required keywords: ${required.filter((keyword) => !requiredMatches.includes(keyword)).join(", ")}`] : []),
  ];

  return {
    overallScore,
    titleFit,
    skillFit,
    seniorityFit,
    industryFit,
    compensationFit,
    remoteFit,
    relocationFit,
    strongestMatches,
    concerns,
    missingKeywords: required.filter((keyword) => !requiredMatches.includes(keyword)),
    recommendedAction: overallScore >= profile.minimumMatchScore ? "Review and consider approval" : "Below threshold",
    aiExplanation:
      strongestMatches.length > 0
        ? `Matched ${strongestMatches.join(", ")} for ${profile.name}.`
        : `Scored using profile threshold and basic title, skill, remote, and compensation signals for ${profile.name}.`,
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function includesTerm(value: string, term: string) {
  return value.toLowerCase().includes(term.toLowerCase());
}

function isSenior(title: string) {
  return /\b(senior|staff|principal|lead|architect|manager)\b/i.test(title);
}

function remoteScore(haystack: string, preference: JobSearchProfile["remotePreference"]) {
  if (preference === "any") return 82;
  if (preference === "hybrid") return haystack.includes("hybrid") ? 90 : 58;
  if (preference === "onsite_relocation") return /relocation|visa|onsite|hybrid/i.test(haystack) ? 84 : 45;
  if (preference === "remote_us_only") return /remote|united states|us only|u\.s\./i.test(haystack) ? 88 : 48;
  if (preference === "remote_global") return /remote|worldwide|global|distributed/i.test(haystack) ? 90 : 52;
  if (preference === "remote_europe") return /remote|europe|emea|eu/i.test(haystack) ? 88 : 50;
  return 65;
}

function relocationScore(haystack: string, preference: JobSearchProfile["relocationPreference"]) {
  if (preference === "unknown" || preference === "not_interested") return 70;
  if (preference === "open_to_relocation") return /relocation|hybrid|onsite/i.test(haystack) ? 82 : 55;
  if (preference === "requires_relocation_support") return /relocation|visa sponsorship|work permit|blue card/i.test(haystack) ? 90 : 42;
  if (preference === "visa_sponsorship_required") return /visa sponsorship|work permit/i.test(haystack) ? 92 : 38;
  if (preference === "eu_blue_card_possible") return /blue card|eu|germany|europe/i.test(haystack) ? 86 : 48;
  return 65;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
