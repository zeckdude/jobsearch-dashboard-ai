import type { JobSearchProfile } from "@prisma/client";
import {
  profileTitleIncludesTerm,
  titleCareSignalsForProfile,
  type TitleCareSignals,
} from "@/lib/job-search/scoring";

export const TITLE_CARE_FETCH_THRESHOLD = 50;

const roleFamilies: Array<{ keys: string[]; tokens: RegExp }> = [
  { keys: ["frontend", "front end", "front-end", "ui", "web"], tokens: /\b(frontend|front end|front-end|ui|web|react|typescript|next\.?js|javascript)\b/i },
  { keys: ["full stack", "fullstack", "full-stack"], tokens: /\b(full.?stack|fullstack|product engineer)\b/i },
  { keys: ["design system", "design systems", "storybook"], tokens: /\b(design systems?|storybook|component library)\b/i },
  { keys: ["developer tools", "devex", "developer experience"], tokens: /\b(devex|developer experience|developer tools|platform engineer|sdk)\b/i },
  { keys: ["ai", "llm", "machine learning"], tokens: /\b(ai|llm|machine learning|ml|applied ai)\b/i },
  { keys: ["software engineer"], tokens: /\b(software engineer|developer)\b/i },
];

const stopwords = new Set([
  "a", "an", "and", "at", "engineer", "for", "in", "of", "or", "senior", "software", "sr", "staff", "the", "to",
]);

export function extractRolePhrase(title: string) {
  return title
    .replace(/^.*?\b(is hiring|are hiring|hiring|is looking for|are looking for|looking for|seeking|needs a|need a)\b/i, "")
    .replace(/\b(is looking|looking)\b.*$/i, "")
    .replace(/\s*[-–|•]\s*(remote|hybrid|onsite|on site|united states|usa|europe|global).*$/i, "")
    .replace(/\s+\b(in|at|for)\s+[A-Z][\w\s&.+-]+$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:a|an)\s+/i, "")
    .trim();
}

export function titleCareScore(title: string, profiles: JobSearchProfile[]) {
  if (!profiles.length || !title.trim()) return 0;

  const variants = Array.from(new Set([title, extractRolePhrase(title)].filter(Boolean)));
  let best = 0;
  for (const candidate of variants) {
    for (const profile of profiles) {
      best = Math.max(best, scoreCandidate(candidate, title, profile));
    }
  }
  return best;
}

export function shouldIncludeInFetched(title: string, profiles: JobSearchProfile[]) {
  return titleCareScore(title, profiles) >= TITLE_CARE_FETCH_THRESHOLD;
}

function scoreCandidate(candidate: string, rawTitle: string, profile: JobSearchProfile) {
  const signals = titleCareSignalsForProfile(candidate, profile);
  if (signals.hardReject) return 0;

  const titles = readStringArray(profile.titles);
  const rawSubstring = titles.some((entry) => profileTitleIncludesTerm(rawTitle, entry));
  const familyOverlap = hasRoleFamilyOverlap(candidate, titles);
  return scoreFromSignals(signals, { rawSubstring, familyOverlap });
}

function scoreFromSignals(
  signals: TitleCareSignals,
  extras: { rawSubstring: boolean; familyOverlap: boolean },
) {
  let score = 0;
  if (signals.explicitMatch) score += 60;
  else if (signals.adjacentMatch) score += 45;
  else if (extras.rawSubstring) score += 40;
  if (extras.familyOverlap) score += 30;
  return Math.min(100, score);
}

function hasRoleFamilyOverlap(title: string, profileTitles: string[]) {
  const normalizedProfile = profileTitles.map((entry) => entry.toLowerCase()).join(" ");
  return roleFamilies.some((family) => {
    const profileHit = family.keys.some((key) => normalizedProfile.includes(key));
    return profileHit && family.tokens.test(title);
  });
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
