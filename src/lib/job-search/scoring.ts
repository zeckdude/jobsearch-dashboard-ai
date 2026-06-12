import type { JobSearchProfile, RemoteType } from "@prisma/client";
import { isClosedListingText } from "@/lib/job-search/url-health";

export type ScoreInput = {
  company: string;
  title: string;
  description: string;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  remoteType?: RemoteType | string | null;
  staleScore?: number;
  urlHealth?: "dead" | "closed" | "ok" | "blocked";
};

export type RequirementSeverity = "hard" | "soft";

export type RequirementResult = {
  code: string;
  label: string;
  severity: RequirementSeverity;
  passed: boolean;
};

export type EvaluationTier = "full" | "partial" | "reject";

export type EvaluationResult = {
  tier: EvaluationTier;
  failedRequirements: Array<{ code: string; label: string; severity: RequirementSeverity }>;
  passedRequirements: Array<{ code: string; label: string }>;
  overallScore: number;
  titleFit: number;
  skillFit: number;
  seniorityFit: number;
  industryFit: number;
  compensationFit: number;
  remoteFit: number;
  relocationFit: number;
  strongestMatches: string[];
  concerns: string[];
  missingKeywords: string[];
  recommendedAction: string;
  aiExplanation: string;
};

export type JobSearchTitleClassification = {
  frontend: boolean;
  fullStack: boolean;
  seniorIc: boolean;
  overSenior: boolean;
  management: boolean;
  backendDataPlatformOnly: boolean;
  nonTarget: boolean;
  genericSoftwareWithoutFrontend: boolean;
};

const FOREIGN_LOCATION_PATTERN =
  /\b(europe|eu\b|emea|uk|united kingdom|germany|france|spain|italy|netherlands|sweden|denmark|poland|ireland|portugal|austria|switzerland|belgium|finland|norway|australia|india|ahmedabad|bangalore|bengaluru|chennai|cochin|kochi|coimbatore|delhi|delhi ncr|mumbai|hyderabad|pune|asia|china|japan|korea|singapore|brazil|mexico|latin america|africa|middle east|egypt|cairo|emirates|dubai|israel|philippines|vietnam|pakistan|bangladesh|nigeria|kenya|south africa|argentina|colombia|chile|peru|canada only|uk only|eu only)\b/i;

const HYBRID_LANGUAGE_PATTERN =
  /\b(hybrid|on[- ]?site|onsite|in[- ]office|office[- ]based|days? (remote|in office|in the office) per week|days? a week (remote|in office)|up to \d+ days? remote|strong preference for hybrid|local office)\b/i;

const PARTIAL_REMOTE_PATTERN =
  /\b(\d+ days? remote per week|up to \d+ days? remote|hybrid near|hybrid work|partially remote)\b/i;

const CONTRACT_PATTERN =
  /\b(\d+[- ]month|contract|freelance|freelancer|temporary|temp role|1099|hourly|part[- ]time)\b/i;

export function evaluateJobAgainstProfile(job: ScoreInput, profile: JobSearchProfile): EvaluationResult {
  const haystack = [job.title, job.company, job.location ?? "", job.description].join(" ").toLowerCase();
  const titleHaystack = job.title.toLowerCase();
  const titles = stringArray(profile.titles);
  const required = stringArray(profile.keywordsRequired);
  const preferred = stringArray(profile.keywordsPreferred);
  const excluded = stringArray(profile.keywordsExcluded);
  const excludedCompanies = stringArray(profile.excludedCompanies);
  const excludedTitles = stringArray(profile.excludedTitles);
  const industries = stringArray(profile.industries);
  const profileText = [...titles, ...required, ...preferred].join(" ").toLowerCase();
  const wantsFrontend = wantsFrontendProfile(profileText);
  const classification = classifyJobSearchTitle(job.title, job.description);

  const titleMatches = titles.filter((title) => includesTerm(job.title, title));
  const adjacentTitleMatches = titles.filter((title) => titleMatches.includes(title) || hasAdjacentTitleMatch(titleHaystack, title));
  const preferredMatches = preferred.filter((keyword) => includesTerm(haystack, keyword));
  const requiredMatches = required.filter((keyword) => includesTerm(haystack, keyword));
  const industryMatches = industries.filter((industry) => includesTerm(haystack, industry));
  const excludedKeywordMatches = excluded.filter((keyword) => includesTerm(haystack, keyword));
  const excludedTitleMatches = excludedTitles.filter((keyword) => includesTerm(job.title, keyword));
  const companyExcludedMatches = excludedCompanies.filter((company) => includesTerm(job.company, company));
  const lowLevelMismatch = hasLowLevelSystemsMismatch(haystack, titles, required, preferred);
  const explicitTitleMatch = titles.some((title) => includesTerm(job.title, title));
  const hasTitleMatch = explicitTitleMatch || adjacentTitleMatches.length > 0;

  const checks: RequirementResult[] = [];

  // --- Hard requirements ---
  if (companyExcludedMatches.length > 0) {
    checks.push({ code: "excluded_company", label: `Excluded company: ${companyExcludedMatches.join(", ")}`, severity: "hard", passed: false });
  } else if (excludedCompanies.length > 0) {
    checks.push({ code: "excluded_company", label: "Not on excluded company list", severity: "hard", passed: true });
  }

  if (excludedKeywordMatches.length > 0 || excludedTitleMatches.length > 0) {
    const terms = [...excludedKeywordMatches, ...excludedTitleMatches];
    checks.push({ code: "excluded_terms", label: `Excluded terms: ${terms.join(", ")}`, severity: "hard", passed: false });
  } else if (excluded.length > 0 || excludedTitles.length > 0) {
    checks.push({ code: "excluded_terms", label: "No excluded terms detected", severity: "hard", passed: true });
  }

  const listingDead =
    (job.staleScore ?? 0) >= 75
    || job.urlHealth === "dead"
    || job.urlHealth === "closed"
    || isClosedListingText(job.description);
  if (listingDead) {
    checks.push({ code: "listing_alive", label: "Listing is closed or no longer available", severity: "hard", passed: false });
  } else {
    checks.push({ code: "listing_alive", label: "Listing appears active", severity: "hard", passed: true });
  }

  const titleFailures: string[] = [];
  if (isClearlyNonTargetTitle(normalizeTerm(job.title))) titleFailures.push("Title is outside target roles (finance, PM, sales, etc.)");
  if (!hasTitleMatch) titleFailures.push("Title does not match any profile target titles");
  if (lowLevelMismatch) titleFailures.push("Low-level/hardware role does not match web/frontend profile");
  if (wantsFrontend && classification.management) titleFailures.push("Management title outside IC target");
  if (wantsFrontend && classification.nonTarget) titleFailures.push("Non-target role (advocacy, solutions, support, etc.)");
  if (wantsFrontend && classification.backendDataPlatformOnly) titleFailures.push("Backend/platform-only title without frontend scope");
  if (wantsFrontend && classification.overSenior && !allowsStaffTitle(profileText, titleHaystack)) {
    titleFailures.push("Staff/principal/lead seniority outside profile target");
  }
  if (wantsFrontend && classification.genericSoftwareWithoutFrontend && !explicitTitleMatch) {
    titleFailures.push("Generic software title without frontend evidence");
  }

  if (titleFailures.length > 0) {
    checks.push({ code: "title_match", label: titleFailures[0], severity: "hard", passed: false });
  } else {
    checks.push({ code: "title_match", label: `Title matches profile targets (${adjacentTitleMatches[0] ?? titles[0] ?? "matched"})`, severity: "hard", passed: true });
  }

  const remoteCheck = checkRemoteRequirement(job, profile, haystack);
  checks.push(remoteCheck);

  const geoCheck = checkGeographyRequirement(job, profile, haystack);
  checks.push(geoCheck);

  // --- Soft requirements ---
  const salaryCheck = checkSalaryRequirement(job, profile);
  checks.push(salaryCheck);

  const contractDetected = CONTRACT_PATTERN.test(haystack);
  if (contractDetected) {
    checks.push({ code: "employment_type", label: "Contract, freelance, or fixed-term role", severity: "soft", passed: false });
  } else {
    checks.push({ code: "employment_type", label: "Full-time or standard employment", severity: "soft", passed: true });
  }

  if (required.length > 0) {
    const missing = required.filter((keyword) => !requiredMatches.includes(keyword));
    if (missing.length > 0) {
      checks.push({ code: "keywords_required", label: `Missing required keywords: ${missing.join(", ")}`, severity: "soft", passed: false });
    } else {
      checks.push({ code: "keywords_required", label: "All required keywords present", severity: "soft", passed: true });
    }
  }

  const failedRequirements = checks.filter((c) => !c.passed).map(({ code, label, severity }) => ({ code, label, severity }));
  const passedRequirements = checks.filter((c) => c.passed).map(({ code, label }) => ({ code, label }));

  const hardFailures = failedRequirements.filter((f) => f.severity === "hard");
  const softFailures = failedRequirements.filter((f) => f.severity === "soft");

  let tier: EvaluationTier;
  if (hardFailures.length > 0) {
    tier = "reject";
  } else if (softFailures.length > 0) {
    tier = "partial";
  } else {
    tier = "full";
  }

  const applicable = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const overallScore = tier === "reject" ? 0 : clamp(Math.round((passed / applicable) * 100));

  const titlePassed = checks.find((c) => c.code === "title_match")?.passed ?? false;
  const remotePassed = checks.find((c) => c.code === "remote_type")?.passed ?? false;
  const geoPassed = checks.find((c) => c.code === "geography")?.passed ?? false;
  const salaryPassed = checks.find((c) => c.code === "salary")?.passed ?? false;

  const strongestMatches = [...adjacentTitleMatches, ...requiredMatches, ...preferredMatches, ...industryMatches].slice(0, 8);
  const concerns = failedRequirements.map((f) => f.label);

  const recommendedAction =
    tier === "full"
      ? "Review and consider approval"
      : tier === "partial"
        ? "Partial match — review when you have time"
        : "Does not meet profile requirements";

  const aiExplanation =
    tier === "reject"
      ? `Rejected for ${profile.name}: ${hardFailures.map((f) => f.label).join("; ")}.`
      : tier === "partial"
        ? `Partial match for ${profile.name}. Passed core checks; pending: ${softFailures.map((f) => f.label).join("; ")}.`
        : strongestMatches.length > 0
          ? `Full match for ${profile.name}: ${strongestMatches.join(", ")}.`
          : `Full match for ${profile.name} — all requirements passed.`;

  return {
    tier,
    failedRequirements,
    passedRequirements,
    overallScore,
    titleFit: titlePassed ? 100 : 0,
    skillFit: clamp(56 + preferredMatches.length * 5 + requiredMatches.length * 7),
    seniorityFit: classification.seniorIc ? 90 : classification.overSenior ? 35 : 58,
    industryFit: clamp(55 + industryMatches.length * 12),
    compensationFit: salaryPassed ? 100 : salaryCheck.severity === "soft" && !salaryPassed ? 40 : 0,
    remoteFit: remotePassed ? 100 : 0,
    relocationFit: geoPassed ? 100 : 0,
    strongestMatches,
    concerns,
    missingKeywords: required.filter((keyword) => !requiredMatches.includes(keyword)),
    recommendedAction,
    aiExplanation,
  };
}

export function scoreJobForProfile(job: ScoreInput, profile: JobSearchProfile) {
  const evaluation = evaluateJobAgainstProfile(job, profile);
  return {
    overallScore: evaluation.overallScore,
    titleFit: evaluation.titleFit,
    skillFit: evaluation.skillFit,
    seniorityFit: evaluation.seniorityFit,
    industryFit: evaluation.industryFit,
    compensationFit: evaluation.compensationFit,
    remoteFit: evaluation.remoteFit,
    relocationFit: evaluation.relocationFit,
    strongestMatches: evaluation.strongestMatches,
    concerns: evaluation.concerns,
    missingKeywords: evaluation.missingKeywords,
    recommendedAction: evaluation.recommendedAction,
    aiExplanation: evaluation.aiExplanation,
    tier: evaluation.tier,
    failedRequirements: evaluation.failedRequirements,
    passedRequirements: evaluation.passedRequirements,
  };
}

function checkRemoteRequirement(job: ScoreInput, profile: JobSearchProfile, haystack: string): RequirementResult {
  const prefs = getActiveRemotePreferences(profile);
  const effectiveType = inferEffectiveRemoteType(job, haystack);
  const partialRemote = PARTIAL_REMOTE_PATTERN.test(haystack);

  const satisfied = prefs.some((pref) => {
    if (pref === "remote_us_only") {
      return effectiveType === "remote" && !partialRemote && !HYBRID_LANGUAGE_PATTERN.test(haystack);
    }
    if (pref === "remote_global") {
      return effectiveType === "remote" && !partialRemote;
    }
    if (pref === "remote_europe") {
      return effectiveType === "remote" && !partialRemote;
    }
    if (pref === "hybrid") {
      return effectiveType === "hybrid" || (effectiveType !== "remote" && HYBRID_LANGUAGE_PATTERN.test(haystack));
    }
    if (pref === "onsite_relocation") {
      return effectiveType === "onsite" || effectiveType === "hybrid" || /relocation|onsite|on site/i.test(haystack);
    }
    if (pref === "any") return true;
    return false;
  });

  const prefLabel = prefs.join(", ").replace(/_/g, " ");
  if (!satisfied) {
    const reason =
      prefs.includes("remote_us_only") && (effectiveType === "hybrid" || effectiveType === "onsite")
        ? `Job is ${effectiveType}, but profile requires remote US only`
        : prefs.includes("remote_us_only") && partialRemote
          ? "Job is hybrid/partial remote, not fully remote"
          : `Work mode (${effectiveType}) does not match profile preferences (${prefLabel})`;
    return { code: "remote_type", label: reason, severity: "hard", passed: false };
  }

  return { code: "remote_type", label: `Work mode matches profile (${prefLabel})`, severity: "hard", passed: true };
}

function checkGeographyRequirement(job: ScoreInput, profile: JobSearchProfile, haystack: string): RequirementResult {
  const countries = stringArray(profile.countries);
  const cities = stringArray(profile.cities);
  const locationText = normalizeTerm(`${job.location ?? ""} ${haystack}`);
  const prefs = getActiveRemotePreferences(profile);
  const wantsUsOnly = prefs.includes("remote_us_only") || countries.some((c) => /united states|usa/i.test(c));

  if (hasForeignLocation(locationText)) {
    if (wantsUsOnly) {
      return { code: "geography", label: "Job location is outside the United States", severity: "hard", passed: false };
    }
  }

  if (cities.length > 0) {
    const cityMatch = cities.some((city) => locationText.includes(normalizeTerm(city)));
    if (!cityMatch) {
      return { code: "geography", label: `Job is not in required city (${cities.join(", ")})`, severity: "hard", passed: false };
    }
    return { code: "geography", label: `Location matches required city (${cities.join(", ")})`, severity: "hard", passed: true };
  }

  if (countries.length > 0) {
    const countryMatch = countries.some((country) => locationMatchesCountry(locationText, country));
    if (!countryMatch && wantsUsOnly && hasUsLocationSignal(locationText)) {
      return { code: "geography", label: "Location is US-compatible", severity: "hard", passed: true };
    }
    if (!countryMatch) {
      return { code: "geography", label: `Job is not in required countries (${countries.join(", ")})`, severity: "hard", passed: false };
    }
    return { code: "geography", label: `Location matches required countries (${countries.join(", ")})`, severity: "hard", passed: true };
  }

  return { code: "geography", label: "No geography restrictions on profile", severity: "hard", passed: true };
}

function checkSalaryRequirement(job: ScoreInput, profile: JobSearchProfile): RequirementResult {
  const targetMin = profile.salaryMin;
  if (!targetMin) {
    return { code: "salary", label: "No salary minimum on profile", severity: "soft", passed: true };
  }

  const currency = profile.salaryCurrency ?? "USD";
  const hasSalary = Boolean(job.salaryMin || job.salaryMax);

  if (!hasSalary) {
    return {
      code: "salary",
      label: `Salary not listed (profile minimum: ${currency} ${targetMin.toLocaleString()})`,
      severity: "soft",
      passed: false,
    };
  }

  const high = job.salaryMax ?? job.salaryMin ?? 0;
  if (high < targetMin) {
    return {
      code: "salary",
      label: `Salary below minimum (${currency} ${high.toLocaleString()} vs ${currency} ${targetMin.toLocaleString()} required)`,
      severity: "soft",
      passed: false,
    };
  }

  return {
    code: "salary",
    label: `Salary meets minimum (${currency} ${targetMin.toLocaleString()}+)`,
    severity: "soft",
    passed: true,
  };
}

function getActiveRemotePreferences(profile: JobSearchProfile) {
  const prefs = stringArray(profile.remotePreferences);
  return prefs.length > 0 ? prefs : [profile.remotePreference];
}

function inferEffectiveRemoteType(job: ScoreInput, haystack: string): RemoteType | "unknown" {
  const declared = job.remoteType;
  if (declared === "hybrid" || declared === "onsite" || declared === "remote") return declared;
  if (HYBRID_LANGUAGE_PATTERN.test(haystack) || PARTIAL_REMOTE_PATTERN.test(haystack)) return "hybrid";
  if (/\b(remote|work from anywhere|wfa|distributed team)\b/i.test(haystack) && !HYBRID_LANGUAGE_PATTERN.test(haystack)) return "remote";
  if (/\b(on[- ]?site|in[- ]office)\b/i.test(haystack)) return "onsite";
  return "unknown";
}

function hasForeignLocation(text: string) {
  return FOREIGN_LOCATION_PATTERN.test(text);
}

function hasUsLocationSignal(text: string) {
  return /\b(united states|usa|u s a|u s\b|us only|remote us|north america|americas|las vegas|nevada|san francisco|new york|seattle|austin|boston|denver|chicago|los angeles|california|texas|washington dc|portland|atlanta|miami|phoenix|philadelphia)\b/i.test(text);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function includesTerm(value: string, term: string) {
  const haystack = normalizeTerm(value);
  const needle = normalizeTerm(term);
  if (!needle) return false;
  if (haystack.includes(needle)) return true;
  const aliases = termAliases(needle);
  return aliases.some((alias) => haystack.includes(alias));
}

export function classifyJobSearchTitle(title: string, description = ""): JobSearchTitleClassification {
  const normalizedTitle = normalizeTerm(title);
  const haystack = normalizeTerm(`${title} ${description}`);
  const frontend = frontendPattern().test(haystack);
  const frontendTitle = frontendPattern().test(normalizedTitle);
  const fullStack = /\b(full stack|fullstack|full-stack)\b/i.test(title);
  const management = /\b(manager|director|head of|vp|vice president|chief|cto)\b/i.test(title);
  const overSenior = /\b(staff|principal|principle|lead|architect|manager|director|head of)\b/i.test(title);
  const seniorIc = /\b(senior|sr)\b/i.test(title) && !overSenior;
  const backendDataPlatform = /\b(backend|back end|data engineer|data platform|analytics engineer|infrastructure|devops|sre|site reliability|compute platform|monetization platform|distributed systems|systems engineer|security platform)\b/i.test(title);
  const backendDataPlatformOnly = backendDataPlatform && !frontendTitle && !fullStack;
  const nonTarget = isClearlyNonTargetTitle(normalizedTitle) || /\b(developer advocate|devrel|developer relations|curriculum|instructor|support engineer|customer support|solutions engineer|solutions architect|solution architect|transformation manager|applied ai transformation|forward deployed|sales engineer|integration engineer)\b/i.test(title);
  const genericSoftwareWithoutFrontend = /\bsoftware engineer\b/i.test(title) && !frontendTitle && !fullStack;

  return {
    frontend,
    fullStack,
    seniorIc,
    overSenior,
    management,
    backendDataPlatformOnly,
    nonTarget,
    genericSoftwareWithoutFrontend,
  };
}

function hasAdjacentTitleMatch(title: string, profileTitle: string) {
  const normalized = normalizeTerm(profileTitle);
  if (normalized.includes("frontend") && /\b(frontend|front-end|ui|web|react|typescript|next\.?js)\b/i.test(title)) return true;
  if (normalized.includes("full stack") && /\b(full.?stack|product engineer)\b/i.test(title)) return true;
  if (normalized.includes("software engineer") && /\b(software engineer|developer|product engineer)\b/i.test(title) && frontendPattern().test(title)) return true;
  if (normalized.includes("developer tools") && /\b(devex|developer|platform|api|sdk|tools?)\b/i.test(title)) return true;
  if (normalized.includes("ai") && /\b(ai|llm|machine learning|ml|applied)\b/i.test(title)) return true;
  return false;
}

function allowsStaffTitle(profileText: string, title: string) {
  return /\bstaff\b/i.test(profileText) && /\bstaff\b/i.test(title) && !/\b(principal|principle|lead|manager|director|architect|head of)\b/i.test(title);
}

function hasLowLevelSystemsMismatch(haystack: string, profileTitles: string[], required: string[], preferred: string[]) {
  const profileText = [...profileTitles, ...required, ...preferred].join(" ").toLowerCase();
  const explicitlyTargetsLowLevel = lowLevelOrHardwarePattern().test(profileText);
  if (explicitlyTargetsLowLevel) return false;
  return lowLevelOrHardwarePattern().test(haystack);
}

function isClearlyNonTargetTitle(title: string) {
  return /\b(intern|new grad|early career|account executive|account manager|sales|recruiter|talent|people partner|customer success|customer support|support engineer|marketing|communications manager|finance|financial|analyst|accountant|accounts payable|legal counsel|designer|product manager|program manager|project manager|business development|operations manager|office manager|general manager|market manager|solutions manager|solutions engineer|solutions architect|solution architect|technical account manager|developer advocate|developer relations|devrel|curriculum developer|instructor|transformation manager|applied ai transformation|forward deployed|electrical engineering|electrical engineer|mechanical engineer|hardware engineer|systems safety engineer|aerospace engineer|avionics engineer)\b/i.test(title);
}

function wantsFrontendProfile(profileText: string) {
  return /\b(frontend|front end|front-end|ui|web|react|typescript|design systems?)\b/i.test(profileText);
}

function frontendPattern() {
  return /\b(frontend|front end|front-end|ui|web|react|typescript|javascript|next\.?js|design systems?|component library|storybook|dashboard|data visualization|admin console|product ui|user interface)\b/i;
}

function lowLevelOrHardwarePattern() {
  return /\b(c\+\+|c plus plus|c\s*\/\s*c\+\+|embedded|embedded c|firmware|robotics software|mission autonomy|autonomy software|flight software|air dominance|strike|advanced effects|real-time systems|real time systems|rtos|cuda|electrical engineering|electrical engineer|mechanical engineer|hardware engineer|fpga|avionics|aerospace engineer|controls engineer|guidance navigation|gnc|radar|rf engineer|signal processing|weapons system|weapons systems|vehicle autonomy)\b/i;
}

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim();
}

function termAliases(term: string) {
  const aliases: Record<string, string[]> = {
    "fullstack": ["full stack", "full-stack"],
    "full stack": ["fullstack", "full-stack"],
    "next js": ["next.js", "nextjs"],
    "typescript": ["type script"],
    "javascript": ["java script"],
    "api integrations": ["api", "integrations", "api platform"],
    "storybook": ["component library", "design system"],
    "saas": ["enterprise software", "b2b"],
    "identity": ["authentication", "auth", "access management"],
    "security": ["secure", "compliance", "trust"],
  };
  return aliases[term] ?? [];
}

function locationMatchesCountry(location: string, country: string) {
  const normalizedCountry = normalizeTerm(country);
  if (!normalizedCountry) return false;
  if (location.includes(normalizedCountry)) return true;
  const aliases: Record<string, string[]> = {
    "united states": ["united states", "usa", "u s", "us", "remote us", "remote usa", "new york", "san francisco", "seattle", "washington d c", "austin", "boston", "california", "las vegas", "nevada", "denver", "chicago", "los angeles", "texas", "atlanta", "miami", "phoenix"],
    "usa": ["united states", "usa", "u s", "us", "remote us", "remote usa", "new york", "san francisco", "seattle", "washington d c", "austin", "boston", "california", "las vegas", "nevada", "denver", "chicago", "los angeles", "texas", "atlanta", "miami", "phoenix"],
    "germany": ["germany", "berlin", "munich"],
    "sweden": ["sweden", "stockholm"],
    "luxembourg": ["luxembourg"],
    "netherlands": ["netherlands", "amsterdam"],
    "denmark": ["denmark", "copenhagen"],
    "ireland": ["ireland", "dublin"],
  };
  return (aliases[normalizedCountry] ?? []).some((alias) => location.includes(alias));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export type TitleCareSignals = {
  hardReject: boolean;
  explicitMatch: boolean;
  adjacentMatch: boolean;
  excludedTitle: boolean;
  wantsFrontend: boolean;
  classification: JobSearchTitleClassification;
};

export function titleCareSignalsForProfile(title: string, profile: JobSearchProfile): TitleCareSignals {
  const titles = stringArray(profile.titles);
  const excludedTitles = stringArray(profile.excludedTitles);
  const titleHaystack = title.toLowerCase();
  const profileText = [
    ...titles,
    ...stringArray(profile.keywordsRequired),
    ...stringArray(profile.keywordsPreferred),
  ].join(" ").toLowerCase();
  const classification = classifyJobSearchTitle(title);
  const explicitMatch = titles.some((entry) => includesTerm(title, entry));
  const adjacentMatch = titles.some((entry) => hasAdjacentTitleMatch(titleHaystack, entry));
  const excludedTitle = excludedTitles.some((entry) => includesTerm(title, entry));
  const wantsFrontend = wantsFrontendProfile(profileText);

  const hardReject = isClearlyNonTargetTitle(normalizeTerm(title))
    || excludedTitle
    || classification.nonTarget
    || (wantsFrontend && classification.management)
    || (wantsFrontend && classification.backendDataPlatformOnly && !explicitMatch && !adjacentMatch);

  return {
    hardReject,
    explicitMatch,
    adjacentMatch,
    excludedTitle,
    wantsFrontend,
    classification,
  };
}

export function profileTitleIncludesTerm(title: string, term: string) {
  return includesTerm(title, term);
}
